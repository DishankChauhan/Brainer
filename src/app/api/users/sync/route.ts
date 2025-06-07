import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Sync Firebase user with local database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, email, name, photoURL } = body

    console.log('POST /api/users/sync - body:', { uid, email, name, photoURL })

    if (!uid || !email) {
      return NextResponse.json({ error: 'UID and email are required' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: uid }
    })

    if (existingUser) {
      console.log('User already exists, updating:', existingUser.email)
      // Update user info if it has changed
      const updatedUser = await prisma.user.update({
        where: { id: uid },
        data: {
          email,
          name: name || existingUser.name,
          image: photoURL || existingUser.image
        }
      })
      return NextResponse.json(updatedUser)
    }

    console.log('Creating new user:', email)
    // Create new user
    const newUser = await prisma.user.create({
      data: {
        id: uid,
        email,
        name: name || email.split('@')[0],
        image: photoURL || null
      }
    })

    console.log('Created user successfully:', newUser.id)
    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ 
      error: 'Failed to sync user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 