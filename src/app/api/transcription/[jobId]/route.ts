import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AWSTranscribeService, isTranscribeAvailable } from '@/lib/aws-transcribe'
import { TranscriptionJobStatus } from '@aws-sdk/client-transcribe'
import { generateSummary } from '@/lib/openai'
import { generateEmbedding, shouldGenerateEmbedding, prepareContentForEmbedding } from '@/lib/embeddings'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    console.log('Checking transcription status for job:', jobId)

    if (!isTranscribeAvailable()) {
      return NextResponse.json(
        { error: 'AWS Transcribe service not configured' },
        { status: 503 }
      )
    }

    // Find the note with this transcription job
    const note = await prisma.note.findFirst({
      where: { transcriptionJobId: jobId },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found for transcription job' },
        { status: 404 }
      )
    }

    // If note already has successful transcript content, don't re-fetch from AWS
    // This prevents overwriting successful results after cleanup
    if (note.transcriptionStatus === 'COMPLETED' && 
        note.content && 
        note.content.includes('📝 Transcription') && 
        !note.content.includes('⚠️ Completed with Issues') &&
        !note.isProcessing) {
      console.log('Note already has successful transcript, returning cached result')
      
      const transformedNote = {
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        isProcessing: note.isProcessing,
        transcriptionStatus: note.transcriptionStatus,
        transcriptionConfidence: note.transcriptionConfidence,
        // AI Summary fields
        summary: note.summary,
        summaryGeneratedAt: note.summaryGeneratedAt?.toISOString(),
        summaryTokensUsed: note.summaryTokensUsed,
        keyPoints: note.keyPoints ? JSON.parse(note.keyPoints) : [],
        hasSummary: note.hasSummary,
        tags: note.tags.map((noteTag: any) => ({
          id: noteTag.tag.id,
          name: noteTag.tag.name,
          color: noteTag.tag.color
        }))
      }

      return NextResponse.json({
        status: 'COMPLETED',
        note: transformedNote,
        jobComplete: true
      })
    }

    // Check transcription status from AWS only if not already completed
    const transcribeService = new AWSTranscribeService()
    const result = await transcribeService.getTranscriptionResult(jobId)

    console.log('Transcription status:', result.status, 'Has transcript:', !!result.transcript)

    // Update note based on transcription status
    let updatedNote = note
    
    if (result.status === TranscriptionJobStatus.COMPLETED) {
      console.log('Transcription completed, updating note')
      
      if (result.transcript && result.transcript.trim()) {
        // Create updated content with transcript
        const confidence = result.confidence ? ` (${Math.round(result.confidence * 100)}% confidence)` : ''
        const updatedContent = `# 🎙️ Voice Recording - Transcribed\n\n**File:** ${note.title.replace('🎙️ Voice Note - ', '')}\n**Transcription Job:** ${jobId}\n**Status:** ✅ Completed${confidence}\n\n## 📝 Transcription\n\n${result.transcript}\n\n---\n\n*Transcribed automatically using AWS Transcribe. You can edit this content to make corrections.*\n\n**Next steps:**\n- Review and edit the transcription if needed\n- Add relevant tags to organize this note\n- Use the content for your projects`

        updatedNote = await prisma.note.update({
          where: { id: note.id },
          data: {
            content: updatedContent,
            transcriptionStatus: 'COMPLETED',
            transcriptionConfidence: result.confidence,
            isProcessing: false
          },
          include: {
            tags: {
              include: {
                tag: true
              }
            }
          }
        })

        // AUTO-GENERATE AI SUMMARY after successful transcription
        if (result.transcript && result.transcript.trim().length >= 50) {
          try {
            console.log('Auto-generating AI summary for transcribed voice note:', note.id)
            
            // Generate AI summary using OpenAI
            const summaryResult = await generateSummary(result.transcript)
            
            // Update the note with AI summary
            updatedNote = await prisma.note.update({
              where: { id: note.id },
              data: {
                summary: summaryResult.summary,
                summaryGeneratedAt: new Date(),
                summaryTokensUsed: summaryResult.tokensUsed,
                keyPoints: JSON.stringify(summaryResult.keyPoints),
                hasSummary: true,
                updatedAt: new Date()
              },
              include: {
                tags: {
                  include: {
                    tag: true
                  }
                }
              }
            })
            
            console.log('AI summary auto-generated successfully for voice note:', note.id)
          } catch (summaryError) {
            console.error('Failed to auto-generate AI summary for voice note:', summaryError)
            // Don't fail the transcription if summary generation fails
            // User can manually generate summary later
          }
        }

        // AUTO-GENERATE EMBEDDING after successful transcription
        if (result.transcript && result.transcript.trim().length >= 10) {
          try {
            console.log('Auto-generating embedding for transcribed voice note:', note.id)
            
            // Prepare content for embedding (include title and transcript)
            const contentForEmbedding = prepareContentForEmbedding(result.transcript)
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
            
            console.log('Embedding auto-generated successfully for voice note:', note.id)
          } catch (embeddingError) {
            console.error('Failed to auto-generate embedding for voice note:', embeddingError)
            // Don't fail the transcription if embedding generation fails
          }
        }

        // Only cleanup if we successfully got the transcript
        if (result.transcript && result.transcript.trim().length > 0) {
          // Clean up S3 files (original audio and transcript)
          if (note.transcriptionS3Key) {
            await transcribeService.cleanupFiles(note.transcriptionS3Key, jobId)
          }
        } else {
          console.log('AWS Transcribe: Skipping cleanup - no transcript retrieved')
        }
      } else {
        // Transcription completed but no transcript received
        const updatedContent = `# 🎙️ Voice Recording - Transcription Complete\n\n**File:** ${note.title.replace('🎙️ Voice Note - ', '')}\n**Transcription Job:** ${jobId}\n**Status:** ⚠️ Completed with Issues\n\n## ⚠️ Transcription Result\n\n**Issue:** The transcription job completed successfully, but no transcript content was received. This could happen if:\n\n- The audio file contained no speech\n- The speech was too unclear to transcribe\n- There was a temporary issue accessing the transcript\n\n**What you can do:**\n- Try uploading the audio file again\n- Check if the audio contains clear speech\n- Add manual transcription below\n\n---\n\n**Manual Transcription Area:**\n\n*Click Edit to add your transcription here...*`

        updatedNote = await prisma.note.update({
          where: { id: note.id },
          data: {
            content: updatedContent,
            transcriptionStatus: 'COMPLETED',
            transcriptionConfidence: result.confidence,
            isProcessing: false
          },
          include: {
            tags: {
              include: {
                tag: true
              }
            }
          }
        })
      }
    } else if (result.status === TranscriptionJobStatus.FAILED) {
      console.log('Transcription failed, updating note')
      
      const errorMessage = result.error || 'Unknown transcription error'
      const updatedContent = `# 🎙️ Voice Recording - Transcription Failed\n\n**File:** ${note.title.replace('🎙️ Voice Note - ', '')}\n**Transcription Job:** ${jobId}\n**Status:** ❌ Failed\n\n## ⚠️ Transcription Error\n\n**Error:** ${errorMessage}\n\n**What you can do:**\n- Try uploading the audio file again\n- Check if the audio file format is supported\n- Add manual transcription below\n\n---\n\n**Manual Transcription Area:**\n\n*Click Edit to add your transcription here...*\n\n---\n\n**Supported formats:** MP3, WAV, M4A, AAC, OGG, FLAC\n**Max file size:** 2GB\n**Max duration:** 4 hours`

      updatedNote = await prisma.note.update({
        where: { id: note.id },
        data: {
          content: updatedContent,
          transcriptionStatus: 'FAILED',
          isProcessing: false
        },
        include: {
          tags: {
            include: {
              tag: true
            }
          }
        }
      })

      // Still try to cleanup AWS resources
      if (note.transcriptionS3Key) {
        try {
          await transcribeService.cleanupFiles(note.transcriptionS3Key, jobId)
        } catch (error) {
          console.error('Failed to cleanup AWS files after failure:', error)
        }
      }
    }

    // Return updated note
    const transformedNote = {
      id: updatedNote.id,
      title: updatedNote.title,
      content: updatedNote.content,
      createdAt: updatedNote.createdAt.toISOString(),
      updatedAt: updatedNote.updatedAt.toISOString(),
      isProcessing: updatedNote.isProcessing,
      transcriptionStatus: updatedNote.transcriptionStatus,
      transcriptionConfidence: updatedNote.transcriptionConfidence,
      // AI Summary fields
      summary: updatedNote.summary,
      summaryGeneratedAt: updatedNote.summaryGeneratedAt?.toISOString(),
      summaryTokensUsed: updatedNote.summaryTokensUsed,
      keyPoints: updatedNote.keyPoints ? JSON.parse(updatedNote.keyPoints) : [],
      hasSummary: updatedNote.hasSummary,
      tags: updatedNote.tags.map((noteTag: any) => ({
        id: noteTag.tag.id,
        name: noteTag.tag.name,
        color: noteTag.tag.color
      }))
    }

    return NextResponse.json({
      status: result.status,
      note: transformedNote,
      jobComplete: result.status === TranscriptionJobStatus.COMPLETED || result.status === TranscriptionJobStatus.FAILED
    })
  } catch (error) {
    console.error('Transcription status check error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check transcription status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 