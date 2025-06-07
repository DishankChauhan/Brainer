import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createWorker } from 'tesseract.js'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const type = formData.get('type') as 'voice' | 'screenshot'

    console.log('Upload API called:', { fileName: file?.name, userId, type })

    if (!file || !userId || !type) {
      return NextResponse.json(
        { error: 'File, userId, and type are required' }, 
        { status: 400 }
      )
    }

    // Validate file types
    if (type === 'voice' && !file.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'Invalid audio file type' }, 
        { status: 400 }
      )
    }

    if (type === 'screenshot' && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid image file type' }, 
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      )
    }

    console.log('Processing file:', file.name, 'for user:', user.email)

    // Convert file to buffer for processing
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${Date.now()}-${file.name}`

    let extractedText = ''
    let summary = ''

    if (type === 'voice') {
      extractedText = await processVoiceFile(buffer, filename)
    } else if (type === 'screenshot') {
      extractedText = await processImageFile(buffer, filename)
    }

    // Generate AI summary (placeholder for now)
    summary = await generateSummary(extractedText, type)

    // Create note with extracted content
    const noteTitle = type === 'voice' 
      ? `🎙️ Voice Note - ${new Date().toLocaleDateString()}`
      : `📸 Screenshot - ${new Date().toLocaleDateString()}`

    const noteContent = summary 
      ? `## AI Summary\n${summary}\n\n## ${type === 'voice' ? 'Transcription' : 'Extracted Text'}\n${extractedText}`
      : extractedText

    const note = await prisma.note.create({
      data: {
        title: noteTitle,
        content: noteContent,
        userId
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    console.log('Created note from', type, 'upload:', note.id)

    // Return the created note
    const transformedNote = {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      tags: note.tags.map((noteTag: any) => ({
        id: noteTag.tag.id,
        name: noteTag.tag.name,
        color: noteTag.tag.color
      }))
    }

    return NextResponse.json(transformedNote, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}

// Voice processing placeholder
async function processVoiceFile(buffer: Buffer, filename: string): Promise<string> {
  console.log('Processing voice file:', filename)
  
  // For now, return a placeholder with file info
  const fileSizeKB = Math.round(buffer.length / 1024)
  
  return `# Voice Recording Uploaded\n\n**File:** ${filename}\n**Size:** ${fileSizeKB} KB\n\n*Voice transcription will be available soon with AWS Transcribe integration.*\n\n---\n\n**What you can do now:**\n- Edit this note to add manual transcription\n- Add tags to organize your voice notes\n- Use this as a placeholder until auto-transcription is ready`
}

// OCR processing with Tesseract.js - configured for Next.js
async function processImageFile(buffer: Buffer, filename: string): Promise<string> {
  console.log('Processing image file with OCR:', filename)
  
  try {
    // Import Tesseract dynamically to avoid SSR issues
    const Tesseract = await import('tesseract.js')
    
    console.log('OCR worker starting...')
    
    // Create worker with simpler configuration
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => console.log('OCR Progress:', m.status, m.progress)
    })
    
    console.log('OCR worker created, processing image...')
    
    // Process the image buffer
    const { data: { text } } = await worker.recognize(buffer)
    
    // Clean up the worker
    await worker.terminate()
    
    console.log('OCR processing complete, extracted text length:', text.length)
    
    if (!text.trim()) {
      return `# Screenshot Processed\n\n**File:** ${filename}\n\n*No text was detected in this image.*\n\nThis could be because:\n- The image contains no text\n- The text is too small or blurry\n- The image is mainly graphics/diagrams\n\nYou can still use this note to:\n- Add manual descriptions\n- Reference the original screenshot\n- Add relevant tags`
    }
    
    return `# Screenshot Text Extraction\n\n**File:** ${filename}\n\n## Extracted Text:\n\n${text.trim()}\n\n---\n\n*Text extracted using OCR technology. Some formatting may be lost.*`
    
  } catch (error) {
    console.error('OCR processing failed:', error)
    
    // Fallback: create a note without OCR
    return `# Screenshot Upload\n\n**File:** ${filename}\n\n*OCR processing failed, but your screenshot has been saved.*\n\n**You can:**\n- Manually add any text content from the image\n- Add a description of what the screenshot contains\n- Use this note to reference the original image\n\n**Technical Details:** OCR service temporarily unavailable. This often resolves itself - try uploading again later.\n\n---\n\n*To add content manually, click the Edit button above.*`
  }
}

// AI summary placeholder
async function generateSummary(text: string, type: 'voice' | 'screenshot'): Promise<string> {
  // Simple rule-based summary for now
  if (!text.trim() || text.length < 50) {
    return ''
  }
  
  const wordCount = text.split(/\s+/).length
  const contentType = type === 'voice' ? 'voice recording' : 'screenshot'
  
  return `**AI Summary**: This ${contentType} contains approximately ${wordCount} words of content. ${
    wordCount > 100 
      ? 'This appears to be a substantial amount of text that may contain important information.' 
      : 'This is a brief snippet of text.'
  }\n\n*Full AI summarization will be available soon with OpenAI integration.*`
} 