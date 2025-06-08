import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Sync Firebase user with local database
export async function POST(request: NextRequest) {
  let body: any
  
  try {
    body = await request.json()
    console.log('POST /api/users/sync - body:', body)
    
    const { uid, email, name, photoURL } = body
    
    if (!uid || !email) {
      return NextResponse.json(
        { error: 'UID and email are required' },
        { status: 400 }
      )
    }

    console.log('Syncing user:', email, 'with UID:', uid)
    
    // Use upsert to handle user creation/update atomically
    // This prevents race conditions and deadlocks
    const user = await prisma.user.upsert({
      where: { id: uid },
      update: {
        email,
        name: name || email.split('@')[0],
        image: photoURL,
        updatedAt: new Date()
      },
      create: {
        id: uid,
        email,
        name: name || email.split('@')[0],
        image: photoURL
      }
    })
    
    console.log('User synced successfully:', user.id)
    return NextResponse.json(user)
    
  } catch (error) {
    console.error('Error syncing user:', error)
    
    // Handle specific Prisma errors
    if (error instanceof Error && body) {
      const { uid, email } = body
      
      // If it's a unique constraint error on email, it means there's already 
      // a user with this email but different UID - this shouldn't happen in normal flow
      if (error.message.includes('Unique constraint failed') && 
          error.message.includes('email')) {
        
        try {
          console.log('Unique constraint on email, checking for existing user...')
          
          // Check if there's a user with this email but different UID
          const existingUser = await prisma.user.findUnique({
            where: { email }
          })
          
          if (existingUser && existingUser.id !== uid) {
            console.log('Found user with same email but different UID. This is unusual and may indicate an account migration.')
            console.log('Returning existing user to avoid conflicts:', existingUser.id)
            return NextResponse.json(existingUser)
          }
          
          // If user exists with same UID, just return it
          if (existingUser && existingUser.id === uid) {
            console.log('User already exists with correct UID:', existingUser.id)
            return NextResponse.json(existingUser)
          }
          
        } catch (fetchError) {
          console.error('Error handling unique constraint:', fetchError)
        }
      }
      
      // For other unique constraint errors (on UID), try to fetch existing user
      if (error.message.includes('Unique constraint failed')) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { id: uid }
          })
          
          if (existingUser) {
            console.log('User already exists, returning existing user:', existingUser.id)
            return NextResponse.json(existingUser)
          }
        } catch (fetchError) {
          console.error('Error fetching existing user:', fetchError)
        }
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to sync user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 