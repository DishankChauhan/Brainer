import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all tags
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

// POST - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color } = body

    if (!name) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
    }

    // Check if tag already exists
    const existingTag = await prisma.tag.findUnique({
      where: { name: name.toLowerCase() }
    })

    if (existingTag) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 409 })
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.toLowerCase(),
        color: color || '#3B82F6'
      }
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error('Error creating tag:', error)
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
  }
} 