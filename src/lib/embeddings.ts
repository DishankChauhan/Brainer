import { openai } from '@/lib/openai'

export interface EmbeddingResult {
  embedding: number[]
  tokensUsed: number
  model: string
}

export interface SimilarNote {
  id: string
  title: string
  content: string
  similarity: number
  createdAt: string
  summary?: string
}

export interface TopicExtractionResult {
  topics: string[]
  concepts: string[]
  tags: string[]
  tokensUsed: number
}

/**
 * Generate embedding vector for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!text || text.trim().length < 10) {
    throw new Error('Text is too short to generate embedding (minimum 10 characters)')
  }

  try {
    // Clean and prepare text for embedding
    const cleanText = text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '')
      .trim()
      .substring(0, 8000) // OpenAI embedding limit

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // 1536 dimensions, cost-effective
      input: cleanText,
      encoding_format: 'float'
    })

    const embedding = response.data[0].embedding
    const tokensUsed = response.usage?.total_tokens || 0

    return {
      embedding,
      tokensUsed,
      model: 'text-embedding-3-small'
    }
  } catch (error) {
    console.error('Error generating embedding:', error)
    if (error instanceof Error) {
      throw new Error(`Embedding generation failed: ${error.message}`)
    }
    throw new Error('Embedding generation failed')
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same dimension')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i]
    normA += vectorA[i] * vectorA[i]
    normB += vectorB[i] * vectorB[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  
  if (magnitude === 0) {
    return 0
  }

  return dotProduct / magnitude
}

/**
 * Extract topics and concepts from note content using GPT
 */
export async function extractTopicsAndConcepts(content: string): Promise<TopicExtractionResult> {
  if (!content || content.trim().length < 20) {
    throw new Error('Content is too short for topic extraction (minimum 20 characters)')
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an AI that extracts topics, concepts, and suggests tags from text content.
          
          Your task:
          1. Identify main topics/themes (3-8 topics)
          2. Extract key concepts (5-12 concepts) 
          3. Suggest relevant tags (3-6 tags)
          
          Rules:
          - Topics: broad themes (e.g. "Project Management", "Machine Learning")
          - Concepts: specific ideas/terms (e.g. "deadline", "neural networks", "user feedback")
          - Tags: searchable keywords (e.g. "work", "ai", "meeting")
          - Return JSON format
          - Keep everything concise and relevant
          
          Example output:
          {
            "topics": ["Project Management", "Team Communication"],
            "concepts": ["deadline", "sprint planning", "user stories", "team sync"],
            "tags": ["work", "planning", "team", "project"]
          }`
        },
        {
          role: 'user',
          content: `Extract topics, concepts, and tags from this content:\n\n${content.substring(0, 2000)}`
        }
      ],
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: "json_object" }
    })

    const result = completion.choices[0]?.message?.content
    if (!result) {
      throw new Error('No response from OpenAI')
    }

    const parsedResult = JSON.parse(result)
    const tokensUsed = completion.usage?.total_tokens || 0

    return {
      topics: parsedResult.topics || [],
      concepts: parsedResult.concepts || [],
      tags: parsedResult.tags || [],
      tokensUsed
    }
  } catch (error) {
    console.error('Error extracting topics:', error)
    if (error instanceof Error) {
      throw new Error(`Topic extraction failed: ${error.message}`)
    }
    throw new Error('Topic extraction failed')
  }
}

/**
 * Format content for embedding (extract main text, ignore markdown formatting)
 */
export function prepareContentForEmbedding(content: string): string {
  return content
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Determine if content is substantial enough for embedding
 */
export function shouldGenerateEmbedding(content: string): boolean {
  const cleanContent = prepareContentForEmbedding(content)
  const wordCount = cleanContent.split(/\s+/).length
  
  // Generate embedding if content has at least 10 words and isn't just metadata
  return wordCount >= 10 && !isMetadataOnly(cleanContent)
}

/**
 * Check if content is mostly metadata/formatting
 */
function isMetadataOnly(content: string): boolean {
  const metadataPatterns = [
    /^(file:|status:|job:|error:|transcription)/i,
    /^(uploading|processing|completed|failed)/i,
    /^\d+%\s+(confidence|completed)/i
  ]
  
  return metadataPatterns.some(pattern => pattern.test(content.trim()))
} 