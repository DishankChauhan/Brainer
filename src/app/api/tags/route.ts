import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { tagSchema } from '@/lib/input-validation'

// GET - Fetch all tags (public - no auth required)
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(tags)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

// POST handler for creating tags (requires authentication)
async function createTagHandler(
  request: AuthenticatedRequest,
  validatedData: { name: string; color?: string }
) {
  try {
    const { name, color } = validatedData

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
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
  }
}

// Export POST handler with authentication and input validation
export const POST = withAuth(
  async (request: AuthenticatedRequest) => {
    try {
      const body = await request.json()
      const validatedData = tagSchema.parse(body)
      return await createTagHandler(request, validatedData)
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid input format'
      }, { status: 400 })
    }
  }
) 