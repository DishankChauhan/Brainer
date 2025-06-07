import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch a specific note
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const note = await prisma.note.findUnique({
      where: { id: params.id },
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
      tags: note.tags.map((noteTag: any) => ({
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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { title, content, tagIds } = body

    // Update the note
    const note = await prisma.note.update({
      where: { id: params.id },
      data: {
        title: title || 'Untitled Note',
        content: content || '',
        updatedAt: new Date()
      }
    })

    // Handle tags update
    if (tagIds !== undefined) {
      // Remove existing tags
      await prisma.noteTags.deleteMany({
        where: { noteId: params.id }
      })

      // Add new tags
      if (tagIds.length > 0) {
        await prisma.noteTags.createMany({
          data: tagIds.map((tagId: string) => ({
            noteId: params.id,
            tagId
          }))
        })
      }
    }

    // Fetch the updated note with tags
    const updatedNote = await prisma.note.findUnique({
      where: { id: params.id },
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
      tags: updatedNote!.tags.map((noteTag: any) => ({
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
  { params }: { params: { id: string } }
) {
  try {
    // Delete associated tags first (cascade should handle this, but being explicit)
    await prisma.noteTags.deleteMany({
      where: { noteId: params.id }
    })

    // Delete the note
    await prisma.note.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
} 