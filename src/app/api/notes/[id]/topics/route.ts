import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTopicsAndConcepts } from '@/lib/embeddings'
import { withResourceOwnership, AuthenticatedRequest, getNoteOwner } from '@/lib/auth-middleware'
import { booleanOptionSchema } from '@/lib/input-validation'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

async function topicsHandler(
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

    // Check if topics already exist and force regenerate is not requested
    if (note.hasTopics && note.extractedTopics && !forceRegenerate) {
      return NextResponse.json({
        message: 'Topics already extracted',
        topics: JSON.parse(note.extractedTopics),
        topicsGeneratedAt: note.topicsGeneratedAt
      })
    }

    // Check if content is sufficient for topic extraction
    if (!note.content || note.content.trim().length < 20) {
      return NextResponse.json({ 
        error: 'Note content is too short for topic extraction (minimum 20 characters required)' 
      }, { status: 400 })
    }

    // Extract topics and concepts using OpenAI
    const topicsResult = await extractTopicsAndConcepts(note.content)

    // Update the note with extracted topics
    await prisma.note.update({
      where: { id },
      data: {
        extractedTopics: JSON.stringify({
          topics: topicsResult.topics,
          concepts: topicsResult.concepts,
          suggestedTags: topicsResult.tags
        }),
        topicsGeneratedAt: new Date(),
        topicsTokensUsed: topicsResult.tokensUsed,
        hasTopics: true,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: 'Topics extracted successfully',
      topics: {
        topics: topicsResult.topics,
        concepts: topicsResult.concepts,
        suggestedTags: topicsResult.tags
      },
      tokensUsed: topicsResult.tokensUsed
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
      error: 'Failed to extract topics',
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
      return await topicsHandler(request, validatedData, { params })
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid input format'
      }, { status: 400 })
    }
  }
) 