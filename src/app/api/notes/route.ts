import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all notes for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    console.log('GET /api/notes - userId:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

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

    console.log('Found notes:', notes.length)

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

// POST - Create a new note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, userId, tagIds } = body

    console.log('POST /api/notes - body:', { title, content, userId, tagIds })

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if user exists first
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      console.error('User not found:', userId)
      return NextResponse.json({ error: 'User not found. Please sign in again.' }, { status: 404 })
    }

    console.log('Creating note for user:', user.email)

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

    console.log('Created note:', note.id)

    // Add tags if provided
    if (tagIds && tagIds.length > 0) {
      console.log('Adding tags:', tagIds)
      await prisma.noteTags.createMany({
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