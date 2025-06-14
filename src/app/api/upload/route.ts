import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createWorker } from 'tesseract.js'
import { AWSTranscribeService, isTranscribeAvailable } from '@/lib/aws-transcribe'
import { getAWSServiceStatus } from '@/lib/aws-config'
import { generateEmbedding, shouldGenerateEmbedding, prepareContentForEmbedding } from '@/lib/embeddings'
import { generateSummary as generateOpenAISummary } from '@/lib/openai'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { validateFileUpload } from '@/lib/input-validation'

async function uploadHandler(request: AuthenticatedRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as 'voice' | 'screenshot'
    const userId = request.user.uid // Get userId from authenticated user

    if (!file || !type) {
      return NextResponse.json(
        { error: 'File and type are required' }, 
        { status: 400 }
      )
    }

    // Validate file upload
    console.log('Upload validation:', { 
      fileName: file.name, 
      fileType: file.type, 
      fileSize: file.size, 
      type 
    })
    
    const validationError = validateFileUpload(file, type)
    if (validationError) {
      console.error('Upload validation failed:', validationError)
      return NextResponse.json(
        { error: validationError },
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

    // Convert file to buffer for processing
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${Date.now()}-${file.name}`

    let extractedText = ''
    let summary = ''
    let transcriptionJobId: string | undefined
    let transcriptionS3Key: string | undefined
    let isProcessing = false

    if (type === 'voice') {
      const result = await processVoiceFile(buffer, filename, userId)
      extractedText = result.content
      transcriptionJobId = result.jobId
      transcriptionS3Key = result.s3Key
      isProcessing = result.isProcessing
    } else if (type === 'screenshot') {
      extractedText = await processImageFile(buffer, filename)
    }

    // Generate AI summary (placeholder for now)
    summary = await generatePlaceholderSummary(extractedText, type)

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
        userId,
        transcriptionJobId,
        transcriptionS3Key,
        transcriptionStatus: transcriptionJobId ? 'IN_PROGRESS' : undefined,
        isProcessing
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    // AUTO-GENERATE EMBEDDING for screenshot content (voice embeddings are handled in transcription completion)
    if (type === 'screenshot' && extractedText && shouldGenerateEmbedding(extractedText)) {
      try {
        // Prepare content for embedding
        const contentForEmbedding = prepareContentForEmbedding(extractedText)
        const fullText = `${noteTitle}\n\n${contentForEmbedding}`
        
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
        
      } catch (embeddingError) {
        // Don't fail the upload if embedding generation fails
      }
    }

    // AUTO-GENERATE AI SUMMARY for screenshot content 
    if (type === 'screenshot' && extractedText && extractedText.length >= 50) {
      try {
        // Generate AI summary using OpenAI
        const summaryResult = await generateOpenAISummary(extractedText)
        
        // Update the note with AI summary
        await prisma.note.update({
          where: { id: note.id },
          data: {
            summary: summaryResult.summary,
            summaryGeneratedAt: new Date(),
            summaryTokensUsed: summaryResult.tokensUsed,
            keyPoints: JSON.stringify(summaryResult.keyPoints),
            hasSummary: true
          }
        })
        
      } catch (summaryError) {
        // Don't fail the upload if summary generation fails
      }
    }

    // Return the created note
    const transformedNote = {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      isProcessing: note.isProcessing,
      transcriptionJobId: note.transcriptionJobId,
      transcriptionStatus: note.transcriptionStatus,
      transcriptionS3Key: note.transcriptionS3Key,
      transcriptionConfidence: note.transcriptionConfidence,
      tags: note.tags.map((noteTag: any) => ({
        id: noteTag.tag.id,
        name: noteTag.tag.name,
        color: noteTag.tag.color
      }))
    }

    return NextResponse.json(transformedNote, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}

// Voice processing with AWS Transcribe integration
async function processVoiceFile(
  buffer: Buffer, 
  filename: string, 
  userId: string
): Promise<{ content: string; jobId?: string; s3Key?: string; isProcessing: boolean }> {
  const fileSizeKB = Math.round(buffer.length / 1024)
  const awsStatus = getAWSServiceStatus()
  
  // Check if AWS Transcribe is available
  if (!isTranscribeAvailable()) {
    return {
      content: `# Voice Recording Uploaded\n\n**File:** ${filename}\n**Size:** ${fileSizeKB} KB\n\n## 🔧 Transcription Service Status\n\n${awsStatus.message}\n\n**To enable automatic transcription:**\n1. Configure AWS credentials in your environment\n2. Set up an S3 bucket for audio storage\n3. Enable AWS Transcribe service\n\n---\n\n**What you can do now:**\n- Edit this note to add manual transcription\n- Add tags to organize your voice notes\n- This note will be automatically updated once transcription is available`,
      isProcessing: false
    }
  }

  try {
    // Initialize AWS Transcribe service
    const transcribeService = new AWSTranscribeService()
    
    // Start transcription job
    const { jobId, s3Key } = await transcribeService.startTranscription(
      buffer, 
      filename, 
      userId
    )
    
    return {
      content: `# 🎙️ Voice Recording - Transcribing...\n\n**File:** ${filename}\n**Size:** ${fileSizeKB} KB\n**Job ID:** ${jobId}\n\n## 🔄 Transcription in Progress\n\nYour voice recording is being processed by AWS Transcribe. This usually takes 1-3 minutes depending on the audio length.\n\n**Status:** Processing started at ${new Date().toLocaleTimeString()}\n\n---\n\n**What happens next:**\n- ✅ Audio uploaded to secure cloud storage\n- 🔄 AI transcription in progress\n- 🔔 This note will automatically update with the transcript\n- 🗑️ Audio files are automatically cleaned up after processing\n\n**You can:**\n- Leave this tab open to see live updates\n- Add tags while waiting\n- Start working on other notes\n\n*This note will refresh automatically when transcription completes.*`,
      jobId,
      s3Key,
      isProcessing: true
    }
  } catch (error) {
    return {
      content: `# Voice Recording Upload\n\n**File:** ${filename}\n**Size:** ${fileSizeKB} KB\n\n## ⚠️ Transcription Service Temporarily Unavailable\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown transcription error'}\n\n**What you can do:**\n- Try uploading again in a few minutes\n- Check your AWS service configuration\n- Add manual transcription below\n\n---\n\n**Manual Transcription Area:**\n\n*Click Edit to add your transcription here...*\n\n---\n\n*Automatic transcription will resume once the service is restored.*`,
      isProcessing: false
    }
  }
}

// Text cleaning function to remove OCR artifacts and unwanted symbols
function cleanOCRText(text: string): string {
  if (!text) return text
  
  return text
    // Remove common OCR artifacts and symbols
    .replace(/[®©™¥€£¢§¶†‡•‰‱°′″‴]/g, '') // Remove trademark, currency, and special symbols
    .replace(/[^\w\s\-.,!?;:()\[\]{}'"@#$%&*+=<>/\\|`~\n]/g, '') // Keep only common punctuation, alphanumeric, and newlines
    
    // Fix common OCR spacing issues
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase letters
    .replace(/([.!?])([A-Z])/g, '$1\n\n$2') // Add line breaks after sentences that start new topics
    .replace(/([a-z])(\d)/g, '$1 $2') // Add space between letters and numbers
    .replace(/(\d)([a-z])/g, '$1 $2') // Add space between numbers and letters
    
    // Handle bullet points and lists
    .replace(/([.!?])\s*([•○▪▫-])/g, '$1\n\n$2') // Line break before bullet points
    .replace(/^([•○▪▫-])/gm, '\n$1') // Ensure bullet points start on new lines
    .replace(/([•○▪▫-])\s*/g, '• ') // Normalize bullet points
    
    // Handle numbered lists
    .replace(/(\d+\.)\s*/g, '\n$1 ') // Put numbered items on new lines
    
    // Handle common document structures
    .replace(/([A-Z][A-Z\s]{3,})/g, '\n\n**$1**\n') // Convert ALL CAPS headers to bold headers
    .replace(/^([A-Z][a-z]+:)/gm, '\n**$1**') // Convert "Label:" patterns to bold
    
    // Fix paragraph breaks
    .replace(/([.!?])\s+([A-Z][a-z])/g, '$1\n\n$2') // Add paragraph breaks between sentences
    .replace(/\n\s*\n\s*\n+/g, '\n\n') // Normalize multiple line breaks to double
    .replace(/\n{4,}/g, '\n\n\n') // Limit to maximum 3 line breaks
    
    // Clean up spacing
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space (but preserve newlines)
    .replace(/\n /g, '\n') // Remove spaces at beginning of lines
    .replace(/ \n/g, '\n') // Remove spaces at end of lines
    
    // Final cleanup
    .replace(/^\s+|\s+$/g, '') // Trim leading/trailing spaces
    .replace(/^[^\w\s]*|[^\w\s]*$/g, '') // Remove leading/trailing non-word characters
    .trim()
}

// OCR processing with Tesseract.js - configured for Next.js
async function processImageFile(buffer: Buffer, filename: string): Promise<string> {
  try {
    // Import Tesseract dynamically to avoid SSR issues
    const Tesseract = await import('tesseract.js')
    
    // Create worker with simpler configuration
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => console.log('OCR Progress:', m.status, m.progress)
    })
    
    // Process the image buffer
    const { data: { text } } = await worker.recognize(buffer)
    
    // Clean up the worker
    await worker.terminate()
    
    // Clean the extracted text to remove OCR artifacts
    const cleanedText = cleanOCRText(text)
    
    if (!cleanedText.trim()) {
      return `# Screenshot Processed\n\n**File:** ${filename}\n\n*No text was detected in this image.*\n\nThis could be because:\n- The image contains no text\n- The text is too small or blurry\n- The image is mainly graphics/diagrams\n\nYou can still use this note to:\n- Add manual descriptions\n- Reference the original screenshot\n- Add relevant tags`
    }
    
    // Format the extracted text nicely
    const formattedText = cleanedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n')
    
    return `# 📸 Screenshot - ${new Date().toLocaleDateString()}\n\n**File:** ${filename}\n**Extracted:** ${new Date().toLocaleTimeString()}\n\n---\n\n## 📄 Extracted Text:\n\n${formattedText}\n\n---\n\n*✨ Text extracted and formatted using OCR technology*`
    
  } catch (error) {
    // Fallback: create a note without OCR
    return `# Screenshot Upload\n\n**File:** ${filename}\n\n*OCR processing failed, but your screenshot has been saved.*\n\n**You can:**\n- Manually add any text content from the image\n- Add a description of what the screenshot contains\n- Use this note to reference the original image\n\n**Technical Details:** OCR service temporarily unavailable. This often resolves itself - try uploading again later.\n\n---\n\n*To add content manually, click the Edit button above.*`
  }
}

// AI summary placeholder
async function generatePlaceholderSummary(text: string, type: 'voice' | 'screenshot'): Promise<string> {
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

// Export handler with authentication middleware
export const POST = withAuth(uploadHandler) 