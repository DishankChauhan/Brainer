import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Sync Firebase user with local database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('POST /api/users/sync - body:', body)
    
    const { uid, email, name, photoURL } = body
    
    if (!uid || !email) {
      return NextResponse.json(
        { error: 'UID and email are required' },
        { status: 400 }
      )
    }

    console.log('Syncing user:', email, 'with UID:', uid)
    
    // Use upsert to handle both create and update scenarios atomically
    // First try to upsert by UID (primary key)
    try {
      const user = await prisma.user.upsert({
        where: { id: uid },
        update: {
          email,
          name,
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
      
      console.log('User upserted successfully:', user.id)
      return NextResponse.json(user)
      
    } catch (upsertError: any) {
      // If upsert fails due to email constraint, it means email exists with different UID
      if (upsertError.code === 'P2002' && upsertError.meta?.target?.includes('email')) {
        console.log('Email exists with different UID, handling conflict...')
        
        // Find the existing user by email
        const existingUser = await prisma.user.findUnique({
          where: { email }
        })
        
        if (existingUser && existingUser.id !== uid) {
          console.log('Found user with same email but different UID:', existingUser.id, '->', uid)
          
          // Delete the old user record (cascade will handle related records)
          await prisma.user.delete({
            where: { email }
          })
          
          // Create new user with correct UID
          const newUser = await prisma.user.create({
            data: {
              id: uid,
              email,
              name: name || email.split('@')[0],
              image: photoURL
            }
          })
          
          console.log('User recreated with new UID:', newUser.id)
          return NextResponse.json(newUser)
        }
      }
      
      // Re-throw if it's a different error
      throw upsertError
    }
    
  } catch (error) {
    console.error('Error syncing user:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to sync user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 