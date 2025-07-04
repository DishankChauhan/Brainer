import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateEmbedding, prepareContentForEmbedding, shouldGenerateEmbedding } from '@/lib/embeddings'
import { withResourceOwnership, AuthenticatedRequest, getNoteOwner } from '@/lib/auth-middleware'
import { booleanOptionSchema } from '@/lib/input-validation'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

async function embeddingHandler(
  request: AuthenticatedRequest,
  validatedData: { forceRegenerate?: boolean },
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const { forceRegenerate } = validatedData
    
    // Find the note
    const note = await prisma.note.findUnique({
      where: { id }
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Check if embedding already exists and force regenerate is not requested
    if (note.hasEmbedding && note.embedding && !forceRegenerate) {
      return NextResponse.json({
        message: 'Embedding already exists',
        hasEmbedding: true,
        embeddingGeneratedAt: note.embeddingGeneratedAt
      })
    }

    // Check if content is suitable for embedding
    if (!shouldGenerateEmbedding(note.content)) {
      return NextResponse.json({ 
        error: 'Note content is not suitable for embedding generation' 
      }, { status: 400 })
    }

    // Prepare content for embedding
    const contentForEmbedding = prepareContentForEmbedding(note.content)
    
    // Include title in embedding for better context
    const fullText = `${note.title}\n\n${contentForEmbedding}`

    // Generate the embedding using OpenAI
    const embeddingResult = await generateEmbedding(fullText)

    // Update the note with the embedding
    await prisma.$executeRaw`
      UPDATE "notes" 
      SET 
        embedding = ${JSON.stringify(embeddingResult.embedding)}::vector,
        "embeddingGeneratedAt" = NOW(),
        "embeddingModel" = ${embeddingResult.model},
        "hasEmbedding" = true,
        "updatedAt" = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({
      message: 'Embedding generated successfully',
      hasEmbedding: true,
      embeddingModel: embeddingResult.model,
      tokensUsed: embeddingResult.tokensUsed
    })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json({ 
          error: 'AI service is not configured. Please contact support.' 
        }, { status: 503 })
      }
      
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json({ 
          error: 'AI service is temporarily unavailable. Please try again later.' 
        }, { status: 429 })
      }
    }

    return NextResponse.json({ 
      error: 'Failed to generate embedding',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Export handler with authentication and resource ownership
export const POST = withResourceOwnership(getNoteOwner)(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const body = await request.json().catch(() => ({}))
      const validatedData = booleanOptionSchema.parse(body)
      return await embeddingHandler(request, validatedData, { params })
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid input format'
      }, { status: 400 })
    }
  }
) 