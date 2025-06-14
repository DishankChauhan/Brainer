import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { userSyncSchema } from '@/lib/input-validation'

// POST - Sync Firebase user with local database
export async function POST(request: NextRequest) {
  let validatedData: any
  
  try {
    const body = await request.json()
    validatedData = userSyncSchema.parse(body)
    
    const { uid, email, name, photoURL } = validatedData
    
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
      }
      return NextResponse.json(user)
    }
    
    // Check if there's already a user with this email (but different UID)
    const existingEmailUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingEmailUser) {
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
    
    return NextResponse.json(user)
    
  } catch (error) {
    // Handle specific Prisma errors as fallback
    if (error instanceof Error && validatedData) {
      const { uid, email } = validatedData
      
      // Try to find and return existing user as fallback
      try {
        // First try by UID
        let existingUser = await prisma.user.findUnique({
          where: { id: uid }
        })
        
        if (existingUser) {
          return NextResponse.json(existingUser)
        }
        
        // Then try by email
        existingUser = await prisma.user.findUnique({
          where: { email }
        })
        
        if (existingUser) {
          return NextResponse.json(existingUser)
        }
        
      } catch (fetchError) {
        // Continue to error response
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