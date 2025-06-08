import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateEmbedding, prepareContentForEmbedding, SimilarNote } from '@/lib/embeddings'

export async function POST(request: NextRequest) {
  try {
    const { query, userId, limit = 5, noteId } = await request.json()
    
    console.log('POST /api/search/similar - query length:', query?.length, 'userId:', userId)

    if (!query || !userId) {
      return NextResponse.json({ error: 'Query and userId are required' }, { status: 400 })
    }

    // For very short queries, return empty results quickly
    if (query.length < 10) {
      return NextResponse.json({
        results: [],
        query,
        tokensUsed: 0
      })
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query)

    // Build SQL query for vector similarity search with optimized performance
    let similarNotes
    
    if (noteId) {
      // Query excluding a specific note
      similarNotes = await prisma.$queryRaw`
        SELECT 
          id,
          title,
          content,
          "createdAt",
          summary,
          (1 - (embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector)) as similarity
        FROM "notes"
        WHERE 
          "userId" = ${userId}
          AND "hasEmbedding" = true
          AND embedding IS NOT NULL
          AND id != ${noteId}
          AND (1 - (embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector)) > 0.25
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector
        LIMIT ${limit}
      ` as Array<{
        id: string
        title: string
        content: string
        createdAt: Date
        summary: string | null
        similarity: number
      }>
    } else {
      // Query without excluding any note
      similarNotes = await prisma.$queryRaw`
        SELECT 
          id,
          title,
          content,
          "createdAt",
          summary,
          (1 - (embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector)) as similarity
        FROM "notes"
        WHERE 
          "userId" = ${userId}
          AND "hasEmbedding" = true
          AND embedding IS NOT NULL
          AND (1 - (embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector)) > 0.25
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector
        LIMIT ${limit}
      ` as Array<{
        id: string
        title: string
        content: string
        createdAt: Date
        summary: string | null
        similarity: number
      }>
    }

    // Format results with faster processing
    const formattedResults: SimilarNote[] = similarNotes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content.substring(0, 150) + (note.content.length > 150 ? '...' : ''), // Reduced from 200 to 150
      similarity: Math.round(note.similarity * 100) / 100,
      createdAt: note.createdAt.toISOString(),
      summary: note.summary || undefined
    }))

    console.log(`Found ${formattedResults.length} similar notes`)

    return NextResponse.json({
      results: formattedResults,
      query,
      tokensUsed: queryEmbedding.tokensUsed
    })

  } catch (error) {
    console.error('Error in semantic search:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json({ 
          error: 'AI service is not configured. Please contact support.' 
        }, { status: 503 })
      }
      
      if (error.message.includes('vector')) {
        return NextResponse.json({ 
          error: 'Vector database not properly configured. Please contact support.' 
        }, { status: 503 })
      }
    }

    return NextResponse.json({ 
      error: 'Failed to perform semantic search',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 