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
    
    // First, try to find existing user by UID
    let user = await prisma.user.findUnique({
      where: { id: uid }
    })
    
    if (user) {
      // User exists, update if needed
      if (user.email !== email || user.name !== (name || email.split('@')[0]) || user.image !== photoURL) {
        user = await prisma.user.update({
          where: { id: uid },
          data: {
            email,
            name: name || email.split('@')[0],
            image: photoURL,
            updatedAt: new Date()
          }
        })
        console.log('User updated successfully:', user.id)
      } else {
        console.log('User already exists with correct data:', user.id)
      }
      return NextResponse.json(user)
    }
    
    // Check if there's already a user with this email (but different UID)
    const existingEmailUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingEmailUser) {
      console.log('User with email already exists but different UID. Potential account conflict.')
      console.log('Existing UID:', existingEmailUser.id, 'New UID:', uid)
      
      // For safety, return the existing user to avoid creating duplicates
      // In a production app, you might want to handle this differently
      return NextResponse.json(existingEmailUser)
    }
    
    // Create new user
    user = await prisma.user.create({
      data: {
        id: uid,
        email,
        name: name || email.split('@')[0],
        image: photoURL
      }
    })
    
    console.log('User created successfully:', user.id)
    return NextResponse.json(user)
    
  } catch (error) {
    console.error('Error syncing user:', error)
    
    // Handle specific Prisma errors as fallback
    if (error instanceof Error && body) {
      const { uid, email } = body
      
      // Try to find and return existing user as fallback
      try {
        // First try by UID
        let existingUser = await prisma.user.findUnique({
          where: { id: uid }
        })
        
        if (existingUser) {
          console.log('Fallback: Found existing user by UID:', existingUser.id)
          return NextResponse.json(existingUser)
        }
        
        // Then try by email
        existingUser = await prisma.user.findUnique({
          where: { email }
        })
        
        if (existingUser) {
          console.log('Fallback: Found existing user by email:', existingUser.id)
          return NextResponse.json(existingUser)
        }
        
      } catch (fetchError) {
        console.error('Error in fallback user fetch:', fetchError)
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