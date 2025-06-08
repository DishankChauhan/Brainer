import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateEmbedding, shouldGenerateEmbedding, prepareContentForEmbedding } from '@/lib/embeddings'

interface NoteTag {
  tag: {
    id: string
    name: string
    color: string
  }
}

// GET - Fetch a specific note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
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
      tags: note.tags.map((noteTag: NoteTag) => ({
        id: noteTag.tag.id,
        name: noteTag.tag.name,
        color: noteTag.tag.color
      }))
    }

    return NextResponse.json(transformedNote)
  } catch (error) {
    console.error('Error fetching note:', error)
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 })
  }
}

// PUT - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, content, tagIds } = body

    // Update the note
    await prisma.note.update({
      where: { id },
      data: {
        title: title || 'Untitled Note',
        content: content || '',
        updatedAt: new Date()
      }
    })

    // AUTO-GENERATE/UPDATE EMBEDDING when content changes and has sufficient content
    if (content && shouldGenerateEmbedding(content)) {
      try {
        console.log('Auto-generating/updating embedding for note:', id)
        
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
          WHERE id = ${id}
        `
        
        console.log('Embedding auto-generated/updated successfully for note:', id)
      } catch (embeddingError) {
        console.error('Failed to auto-generate/update embedding for note:', embeddingError)
        // Don't fail the note update if embedding generation fails
      }
    }

    // Handle tags update
    if (tagIds !== undefined) {
      // Remove existing tags
      await prisma.noteTags.deleteMany({
        where: { noteId: id }
      })

      // Add new tags
      if (tagIds.length > 0) {
        await prisma.noteTags.createMany({
          data: tagIds.map((tagId: string) => ({
            noteId: id,
            tagId
          }))
        })
      }
    }

    // Fetch the updated note with tags
    const updatedNote = await prisma.note.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    const transformedNote = {
      id: updatedNote!.id,
      title: updatedNote!.title,
      content: updatedNote!.content,
      createdAt: updatedNote!.createdAt.toISOString(),
      updatedAt: updatedNote!.updatedAt.toISOString(),
      isProcessing: updatedNote!.isProcessing,
      transcriptionJobId: updatedNote!.transcriptionJobId,
      transcriptionStatus: updatedNote!.transcriptionStatus,
      transcriptionS3Key: updatedNote!.transcriptionS3Key,
      transcriptionConfidence: updatedNote!.transcriptionConfidence,
      // AI Summary fields
      summary: updatedNote!.summary,
      summaryGeneratedAt: updatedNote!.summaryGeneratedAt?.toISOString(),
      summaryTokensUsed: updatedNote!.summaryTokensUsed,
      keyPoints: updatedNote!.keyPoints ? JSON.parse(updatedNote!.keyPoints) : [],
      hasSummary: updatedNote!.hasSummary,
      // Vector Embeddings for Semantic Search
      hasEmbedding: updatedNote!.hasEmbedding,
      embeddingGeneratedAt: updatedNote!.embeddingGeneratedAt?.toISOString(),
      embeddingModel: updatedNote!.embeddingModel,
      tags: updatedNote!.tags.map((noteTag: NoteTag) => ({
        id: noteTag.tag.id,
        name: noteTag.tag.name,
        color: noteTag.tag.color
      }))
    }

    return NextResponse.json(transformedNote)
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

// DELETE - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Delete associated tags first (cascade should handle this, but being explicit)
    await prisma.noteTags.deleteMany({
      where: { noteId: id }
    })

    // Delete the note
    await prisma.note.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
} 