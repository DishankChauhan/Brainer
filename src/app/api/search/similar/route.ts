import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateEmbedding } from '@/lib/embeddings'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { similarSearchSchema } from '@/lib/input-validation'

interface SimilarNote {
  id: string
  title: string
  content: string
  similarity: number
  createdAt: string
  summary?: string
}

async function similarSearchHandler(
  request: AuthenticatedRequest,
  validatedData: { query: string; limit?: number; noteId?: string }
) {
  try {
    const { query, limit = 5, noteId } = validatedData
    const userId = request.user.uid // Get userId from authenticated user

    console.log('Similar search: Starting search for user:', userId)
    console.log('Similar search: Query:', query)
    console.log('Similar search: Exclude note ID:', noteId)

    // First, let's see how many notes this user has
    const totalNotes = await prisma.note.count({
      where: { userId }
    })
    console.log('Similar search: User has', totalNotes, 'total notes')

    // Split query into words for more flexible matching
    const queryWords = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2) // Only use words longer than 2 characters
      .slice(0, 10) // Limit to first 10 words to avoid too complex queries

    console.log('Similar search: Query words:', queryWords)

    if (queryWords.length === 0) {
      console.log('Similar search: No valid query words found')
      return NextResponse.json({
        results: [],
        query,
        tokensUsed: 0,
        fallback: 'text-search',
        debug: 'No valid query words'
      })
    }

    // Build flexible search conditions
    const searchConditions = queryWords.map(word => ({
      OR: [
        { title: { contains: word, mode: 'insensitive' as const } },
        { content: { contains: word, mode: 'insensitive' as const } }
      ]
    }))

    console.log('Similar search: Search conditions:', JSON.stringify(searchConditions, null, 2))

    const textSearchResults = await prisma.note.findMany({
      where: {
        userId,
        OR: searchConditions,
        ...(noteId && { id: { not: noteId } })
      },
      take: limit * 2, // Get more results to filter and rank
      orderBy: { updatedAt: 'desc' }
    })

    console.log('Similar search: Found', textSearchResults.length, 'raw results')

    // Calculate simple similarity score based on word matches
    const scoredResults = textSearchResults.map(note => {
      const noteText = (note.title + ' ' + note.content).toLowerCase()
      const matchedWords = queryWords.filter(word => noteText.includes(word))
      const similarity = matchedWords.length / queryWords.length
      
      return {
        ...note,
        similarity,
        matchedWords
      }
    })

    // Sort by similarity and take top results
    const sortedResults = scoredResults
      .filter(result => result.similarity > 0.1) // Only include results with at least 10% word match
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    console.log('Similar search: Scored results:', sortedResults.map(r => ({
      id: r.id,
      title: r.title.substring(0, 50),
      similarity: r.similarity,
      matchedWords: r.matchedWords
    })))

    const formattedResults: SimilarNote[] = sortedResults.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content.substring(0, 150) + (note.content.length > 150 ? '...' : ''),
      similarity: note.similarity,
      createdAt: note.createdAt.toISOString(),
      summary: note.summary || undefined
    }))

    console.log('Similar search: Returning', formattedResults.length, 'formatted results')

    return NextResponse.json({
      results: formattedResults,
      query,
      tokensUsed: 0,
      fallback: 'text-search',
      debug: {
        totalNotes,
        queryWords,
        rawResults: textSearchResults.length,
        scoredResults: sortedResults.length
      }
    })

  } catch (error) {
    console.error('Error in text search:', error)
    
    return NextResponse.json({ 
      error: 'Failed to perform search',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Export handler with authentication middleware and input validation
export const POST = withAuth(
  async (request: AuthenticatedRequest) => {
    let body: any = null
    
    try {
      body = await request.json()
      console.log('Similar search: Received body:', body)
      
      const validatedData = similarSearchSchema.parse(body)
      console.log('Similar search: Validated data:', validatedData)
      
      return await similarSearchHandler(request, validatedData)
    } catch (error) {
      console.error('Similar search validation error:', error)
      
      if (error instanceof Error && error.name === 'ZodError') {
        // Handle Zod validation errors with detailed messages
        const zodError = error as any
        const errorDetails = zodError.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
        
        return NextResponse.json({
          error: 'Invalid input',
          details: errorDetails,
          received: body
        }, { status: 400 })
      }
      
      return NextResponse.json({
        error: 'Invalid input format',
        details: error instanceof Error ? error.message : 'Unknown validation error',
        received: body
      }, { status: 400 })
    }
  }
) 