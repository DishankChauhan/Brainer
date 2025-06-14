import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateEmbedding, shouldGenerateEmbedding, prepareContentForEmbedding } from '@/lib/embeddings'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { noteSchema } from '@/lib/input-validation'

// POST handler for creating notes
async function createNoteHandler(
  request: AuthenticatedRequest,
  validatedData: { title?: string; content?: string; tagIds?: string[] }
) {
  try {
    const { title, content, tagIds } = validatedData
    const userId = request.user.uid

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found. Please sign in again.' }, { status: 404 })
    }

    // Create the note
    const note = await prisma.note.create({
      data: {
        title: title || 'Untitled Note',
        content: content || '',
        userId
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    // AUTO-GENERATE EMBEDDING if content is suitable
    if (content && shouldGenerateEmbedding(content)) {
      try {
        // Prepare content for embedding
        const contentForEmbedding = prepareContentForEmbedding(content)
        const fullText = `${title || 'Untitled Note'}\n\n${contentForEmbedding}`
        
        // Generate embedding
        const embeddingResult = await generateEmbedding(fullText)
        
        // Update the note with embedding
        await prisma.$executeRaw`
          UPDATE "notes" 
          SET 
            embedding = ${JSON.stringify(embeddingResult.embedding)}::vector,
            "embeddingGeneratedAt" = NOW(),
            "embeddingModel" = ${embeddingResult.model},
            "hasEmbedding" = true
          WHERE id = ${note.id}
        `
        
      } catch (embeddingError) {
        console.error('Failed to auto-generate embedding for note:', embeddingError)
        // Don't fail note creation if embedding generation fails
      }
    }

    // Add tags if provided
    if (tagIds && tagIds.length > 0) {
      await prisma.noteTag.createMany({
        data: tagIds.map((tagId: string) => ({
          noteId: note.id,
          tagId
        }))
      })

      // Fetch the note again with tags
      const noteWithTags = await prisma.note.findUnique({
        where: { id: note.id },
        include: {
          tags: {
            include: {
              tag: true
            }
          }
        }
      })

      const transformedNote = {
        id: noteWithTags!.id,
        title: noteWithTags!.title,
        content: noteWithTags!.content,
        createdAt: noteWithTags!.createdAt.toISOString(),
        updatedAt: noteWithTags!.updatedAt.toISOString(),
        isProcessing: noteWithTags!.isProcessing,
        transcriptionJobId: noteWithTags!.transcriptionJobId,
        transcriptionStatus: noteWithTags!.transcriptionStatus,
        transcriptionS3Key: noteWithTags!.transcriptionS3Key,
        transcriptionConfidence: noteWithTags!.transcriptionConfidence,
        // AI Summary fields
        summary: noteWithTags!.summary,
        summaryGeneratedAt: noteWithTags!.summaryGeneratedAt?.toISOString(),
        summaryTokensUsed: noteWithTags!.summaryTokensUsed,
        keyPoints: noteWithTags!.keyPoints ? JSON.parse(noteWithTags!.keyPoints) : [],
        hasSummary: noteWithTags!.hasSummary,
        // Vector Embeddings for Semantic Search
        hasEmbedding: noteWithTags!.hasEmbedding,
        embeddingGeneratedAt: noteWithTags!.embeddingGeneratedAt?.toISOString(),
        embeddingModel: noteWithTags!.embeddingModel,
        tags: noteWithTags!.tags.map((noteTag: { tag: { id: any; name: any; color: any } }) => ({
          id: noteTag.tag.id,
          name: noteTag.tag.name,
          color: noteTag.tag.color
        }))
      }

      return NextResponse.json(transformedNote, { status: 201 })
    }

    const transformedNote = {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      isProcessing: note.isProcessing,
      transcriptionJobId: note.transcriptionJobId,
      transcriptionStatus: note.transcriptionStatus,
      transcriptionS3Key: note.transcriptionS3Key,
      transcriptionConfidence: note.transcriptionConfidence,
      // AI Summary fields
      summary: note.summary,
      summaryGeneratedAt: note.summaryGeneratedAt?.toISOString(),
      summaryTokensUsed: note.summaryTokensUsed,
      keyPoints: note.keyPoints ? JSON.parse(note.keyPoints) : [],
      hasSummary: note.hasSummary,
      // Vector Embeddings for Semantic Search
      hasEmbedding: note.hasEmbedding,
      embeddingGeneratedAt: note.embeddingGeneratedAt?.toISOString(),
      embeddingModel: note.embeddingModel,
      tags: []
    }

    return NextResponse.json(transformedNote, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ 
      error: 'Failed to create note',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Export handlers with authentication middleware
export const GET = withAuth(
  async (request: AuthenticatedRequest) => {
    try {
      const userId = request.user.uid
      
      const notes = await prisma.note.findMany({
        where: { userId },
        include: {
          tags: {
            include: {
              tag: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      // Transform the data to match our frontend interface
      const transformedNotes = notes.map((note: any) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        isProcessing: note.isProcessing,
        transcriptionJobId: note.transcriptionJobId,
        transcriptionStatus: note.transcriptionStatus,
        transcriptionS3Key: note.transcriptionS3Key,
        transcriptionConfidence: note.transcriptionConfidence,
        // AI Summary fields
        summary: note.summary,
        summaryGeneratedAt: note.summaryGeneratedAt?.toISOString(),
        summaryTokensUsed: note.summaryTokensUsed,
        keyPoints: note.keyPoints ? JSON.parse(note.keyPoints) : [],
        hasSummary: note.hasSummary,
        // Vector Embeddings for Semantic Search
        hasEmbedding: note.hasEmbedding,
        embeddingGeneratedAt: note.embeddingGeneratedAt?.toISOString(),
        embeddingModel: note.embeddingModel,
        tags: note.tags.map((noteTag: { tag: { id: any; name: any; color: any } }) => ({
          id: noteTag.tag.id,
          name: noteTag.tag.name,
          color: noteTag.tag.color
        }))
      }))

      return NextResponse.json(transformedNotes)
    } catch (error) {
      console.error('Error fetching notes:', error)
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }
  }
)

export const POST = withAuth(
  async (request: AuthenticatedRequest) => {
    try {
      const body = await request.json()
      const validatedData = noteSchema.parse(body)
      return await createNoteHandler(request, validatedData)
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid input format'
      }, { status: 400 })
    }
  }
) 