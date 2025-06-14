import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Common validation schemas
export const noteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  content: z.string().max(50000, 'Content too long').optional(),
  tagIds: z.array(z.string().regex(/^[a-z0-9]{20,30}$/, 'Invalid tag ID')).optional()
})

export const tagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name too long').trim(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional()
})

export const userSyncSchema = z.object({
  uid: z.string().min(1, 'UID is required').max(128, 'UID too long'),
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  name: z.string().max(100, 'Name too long').optional(),
  photoURL: z.string().url('Invalid photo URL').optional().nullable()
})

export const voiceAssistantSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query too long').trim(),
  notes: z.array(z.any()).optional(),
  userId: z.string().min(1, 'User ID is required').optional()
})

export const similarSearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query too long').trim(),
  limit: z.number().min(1, 'Limit must be at least 1').max(20, 'Limit too high').optional(),
  noteId: z.string().regex(/^[a-z0-9]{20,30}$/, 'Invalid note ID format').optional()
})

export const booleanOptionSchema = z.object({
  forceRegenerate: z.boolean().optional()
})

// File upload validation
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_AUDIO_TYPES = [
  'audio/wav', 
  'audio/mp3', 
  'audio/mpeg', 
  'audio/mp4', 
  'audio/x-m4a',  // Non-standard M4A MIME type
  'audio/webm', 
  'audio/ogg', 
  'audio/aac', 
  'audio/flac'
]
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function validateFileUpload(file: File, type: 'voice' | 'screenshot'): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return 'File size too large (max 10MB)'
  }

  if (type === 'voice') {
    // Check if the MIME type starts with any allowed audio type
    // This handles cases where browsers add codec info like "audio/webm;codecs=opus"
    const isValidAudio = ALLOWED_AUDIO_TYPES.some(allowedType => 
      file.type.startsWith(allowedType)
    )
    
    // Additional check for M4A files which can have various MIME types
    const isM4A = file.name.toLowerCase().endsWith('.m4a') && 
                  (file.type.includes('m4a') || file.type === 'audio/mp4' || file.type === 'audio/x-m4a')
    
    if (!isValidAudio && !isM4A) {
      return `Invalid audio file type: ${file.type}. Supported types: ${ALLOWED_AUDIO_TYPES.join(', ')}, and M4A files`
    }
  }

  if (type === 'screenshot' && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Invalid image file type'
  }

  return null
}

// Middleware wrapper for input validation
export function withValidation<T extends any[]>(
  schema: z.ZodSchema<any>
) {
  return function(
    handler: (request: NextRequest, validatedData: any, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      try {
        const body = await request.json().catch(() => ({}))
        const validatedData = schema.parse(body)
        
        return await handler(request, validatedData, ...args)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json({
            error: 'Invalid input',
            details: error.errors.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
          }, { status: 400 })
        }
        
        return NextResponse.json({
          error: 'Invalid request format'
        }, { status: 400 })
      }
    }
  }
}

// Sanitize text content to prevent XSS
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

// Rate limiting helpers
export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  key: string, 
  limit: number, 
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    // Reset or initialize
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs
    }
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: record.resetTime
    }
  }

  record.count++
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: record.resetTime
  }
} 