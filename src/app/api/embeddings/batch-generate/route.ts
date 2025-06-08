import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateEmbedding, shouldGenerateEmbedding, prepareContentForEmbedding } from '@/lib/embeddings'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get notes without embeddings that are suitable for embedding
    const notesWithoutEmbeddings = await prisma.note.findMany({
      where: { 
        userId,
        hasEmbedding: false
      },
      select: {
        id: true,
        title: true,
        content: true
      }
    })

    const suitableNotes = notesWithoutEmbeddings.filter(note => shouldGenerateEmbedding(note.content))
    
    console.log(`Found ${suitableNotes.length} notes suitable for embedding generation`)

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const note of suitableNotes) {
      try {
        console.log(`Generating embedding for note ${note.id}: ${note.title}`)
        
        // Prepare content for embedding
        const contentForEmbedding = prepareContentForEmbedding(note.content)
        const fullText = `${note.title}\n\n${contentForEmbedding}`
        
        // Generate embedding
        const embeddingResult = await generateEmbedding(fullText)
        
        // Update the note with embedding
        await prisma.$executeRaw`
          UPDATE "notes" 
          SET 
            embedding = ${JSON.stringify(embeddingResult.embedding)}::vector,
            "embeddingGeneratedAt" = NOW(),
            "embeddingModel" = ${embeddingResult.model},
            "hasEmbedding" = true
          WHERE id = ${note.id}
        `
        
        results.push({
          id: note.id,
          title: note.title,
          status: 'success',
          tokensUsed: embeddingResult.tokensUsed
        })
        
        successCount++
        console.log(`✅ Generated embedding for note: ${note.title}`)
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Failed to generate embedding for note ${note.id}:`, error)
        results.push({
          id: note.id,
          title: note.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        errorCount++
      }
    }

    return NextResponse.json({
      message: `Processed ${suitableNotes.length} notes`,
      totalNotesChecked: notesWithoutEmbeddings.length,
      notesProcessed: suitableNotes.length,
      successCount,
      errorCount,
      results
    })

  } catch (error) {
    console.error('Error generating missing embeddings:', error)
    return NextResponse.json({ 
      error: 'Failed to generate embeddings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 