import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken } from './firebase-admin'
import { prisma } from './prisma'
import { SubscriptionStatus, SubscriptionPlan } from '@prisma/client'

export interface AuthenticatedUser {
  uid: string
  email: string | undefined
  dbUser?: {
    id: string
    email: string
    name: string | null
    subscriptionStatus: SubscriptionStatus
    subscriptionPlan: SubscriptionPlan
  }
}

export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser
}

// Authentication middleware function
export function withAuth<T extends any[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { 
            error: 'Authentication required',
            message: 'Please provide a valid authorization token' 
          },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7) // Remove 'Bearer ' prefix
      
      // Verify Firebase token
      const verification = await verifyFirebaseToken(token)
      
      if (!verification.success) {
        return NextResponse.json(
          { 
            error: 'Invalid authentication token',
            message: verification.error || 'Token verification failed'
          },
          { status: 401 }
        )
      }

      // Get user from database
      const dbUser = await prisma.user.findUnique({
        where: { id: verification.uid },
        select: {
          id: true,
          email: true,
          name: true,
          subscriptionStatus: true,
          subscriptionPlan: true
        }
      })

      if (!dbUser) {
        return NextResponse.json(
          { 
            error: 'User not found',
            message: 'User account not found in database. Please sign in again.'
          },
          { status: 404 }
        )
      }

      // Attach user to request
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = {
        uid: verification.uid || '',
        email: verification.email || '',
        dbUser: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          subscriptionStatus: dbUser.subscriptionStatus,
          subscriptionPlan: dbUser.subscriptionPlan
        }
      }

      // Call the actual handler
      return await handler(authenticatedRequest, ...args)
      
    } catch (error) {
      console.error('Authentication middleware error:', error)
      return NextResponse.json(
        { 
          error: 'Authentication error',
          message: 'An error occurred during authentication'
        },
        { status: 500 }
      )
    }
  }
}

// Middleware for routes that require specific subscription plans
export function withSubscription(requiredPlan: 'FREE' | 'PRO' | 'TEAM') {
  return function<T extends any[]>(
    handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
  ) {
    return withAuth(async (request: AuthenticatedRequest, ...args: T) => {
      const userPlan = request.user.dbUser?.subscriptionPlan

      // Define plan hierarchy: FREE < PRO < TEAM
      const planHierarchy = { FREE: 0, PRO: 1, TEAM: 2 }
      
      const requiredLevel = planHierarchy[requiredPlan]
      const userLevel = planHierarchy[userPlan as keyof typeof planHierarchy] || 0

      if (userLevel < requiredLevel) {
        return NextResponse.json(
          { 
            error: 'Subscription required',
            message: `This feature requires a ${requiredPlan} subscription or higher`,
            userPlan,
            requiredPlan
          },
          { status: 403 }
        )
      }

      return await handler(request, ...args)
    })
  }
}

// Middleware to check if user owns the resource (for routes with IDs)
export function withResourceOwnership(
  getResourceUserId: (resourceId: string) => Promise<string | null>
) {
  return function<T extends any[]>(
    handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
  ) {
    return withAuth(async (request: AuthenticatedRequest, ...args: T) => {
      // Extract resource ID from URL params
      const url = new URL(request.url)
      const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0)
      
      let resourceId: string | undefined
      
      // Handle different route patterns
      if (pathSegments.includes('notes')) {
        // For /api/notes/[id] or /api/notes/[id]/action patterns
        const notesIndex = pathSegments.indexOf('notes')
        if (notesIndex !== -1 && pathSegments.length > notesIndex + 1) {
          resourceId = pathSegments[notesIndex + 1]
        }
      } else if (pathSegments.includes('transcription')) {
        // For /api/transcription/[jobId] pattern
        const transcriptionIndex = pathSegments.indexOf('transcription')
        if (transcriptionIndex !== -1 && pathSegments.length > transcriptionIndex + 1) {
          resourceId = pathSegments[transcriptionIndex + 1]
        }
      } else {
        // Fallback: assume the last segment is the ID (for other patterns)
        resourceId = pathSegments[pathSegments.length - 1]
      }

      if (!resourceId) {
        return NextResponse.json(
          { error: 'Resource ID not found' },
          { status: 400 }
        )
      }

      const resourceUserId = await getResourceUserId(resourceId)
      
      if (!resourceUserId) {
        return NextResponse.json(
          { error: 'Resource not found' },
          { status: 404 }
        )
      }

      if (resourceUserId !== request.user.uid) {
        return NextResponse.json(
          { error: 'Access denied', message: 'You do not have permission to access this resource' },
          { status: 403 }
        )
      }

      return await handler(request, ...args)
    })
  }
}

// Helper function to get note owner
export async function getNoteOwner(noteId: string): Promise<string | null> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { userId: true }
  })
  return note?.userId || null
}

// Helper function to get transcription job owner
export async function getTranscriptionJobOwner(jobId: string): Promise<string | null> {
  const note = await prisma.note.findFirst({
    where: { transcriptionJobId: jobId },
    select: { userId: true }
  })
  return note?.userId || null
}

// Rate limiting helper (basic implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function withRateLimit(maxRequests: number, windowMs: number) {
  return function<T extends any[]>(
    handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
  ) {
    return withAuth(async (request: AuthenticatedRequest, ...args: T) => {
      const userId = request.user.uid
      const now = Date.now()
      
      const userRequests = requestCounts.get(userId)
      
      if (!userRequests || now > userRequests.resetTime) {
        // Reset or initialize counter
        requestCounts.set(userId, { count: 1, resetTime: now + windowMs })
      } else {
        // Increment counter
        userRequests.count++
        
        if (userRequests.count > maxRequests) {
          return NextResponse.json(
            { 
              error: 'Rate limit exceeded',
              message: `Too many requests. Try again in ${Math.ceil((userRequests.resetTime - now) / 1000)} seconds.`
            },
            { status: 429 }
          )
        }
      }

      return await handler(request, ...args)
    })
  }
} 