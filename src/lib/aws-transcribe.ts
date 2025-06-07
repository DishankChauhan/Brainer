import { 
  StartTranscriptionJobCommand, 
  GetTranscriptionJobCommand,
  TranscriptionJobStatus,
  MediaFormat,
  type TranscriptionJob
} from '@aws-sdk/client-transcribe'
import { 
  PutObjectCommand, 
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command 
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { createAWSClients, AWS_CONFIG, validateAWSConfig } from './aws-config'
import { v4 as uuidv4 } from 'uuid'

export interface TranscriptionResult {
  jobId: string
  status: TranscriptionJobStatus
  transcript?: string
  confidence?: number
  error?: string
}

export class AWSTranscribeService {
  private transcribeClient
  private s3Client

  constructor() {
    if (!validateAWSConfig()) {
      throw new Error('AWS configuration is required for transcription service')
    }
    
    const { transcribeClient, s3Client } = createAWSClients()
    this.transcribeClient = transcribeClient
    this.s3Client = s3Client
  }

  /**
   * Upload audio file to S3 and start transcription job
   */
  async startTranscription(
    audioBuffer: Buffer, 
    fileName: string, 
    userId: string
  ): Promise<{ jobId: string; s3Key: string }> {
    try {
      console.log('AWS Transcribe: Starting transcription for', fileName)

      // Generate unique identifiers
      const jobId = `transcribe-${userId}-${uuidv4()}`
      const s3Key = `audio/${userId}/${Date.now()}-${fileName}`
      
      // Upload audio file to S3
      console.log('AWS Transcribe: Uploading to S3:', s3Key)
      
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: AWS_CONFIG.s3BucketName,
          Key: s3Key,
          Body: audioBuffer,
          ContentType: this.getContentType(fileName),
        },
      })

      await upload.done()
      console.log('AWS Transcribe: Upload completed')

      // Start transcription job
      const s3Uri = `s3://${AWS_CONFIG.s3BucketName}/${s3Key}`
      
      const transcribeCommand = new StartTranscriptionJobCommand({
        TranscriptionJobName: jobId,
        LanguageCode: 'en-US', // TODO: Make this configurable
        MediaFormat: this.getMediaFormat(fileName),
        Media: {
          MediaFileUri: s3Uri,
        },
        OutputBucketName: AWS_CONFIG.s3BucketName,
        Settings: {
          ShowSpeakerLabels: true,
          MaxSpeakerLabels: 5,
        },
      })

      await this.transcribeClient.send(transcribeCommand)
      console.log('AWS Transcribe: Job started:', jobId)

      return { jobId, s3Key }
    } catch (error) {
      console.error('AWS Transcribe: Failed to start transcription:', error)
      throw new Error(`Failed to start transcription: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check transcription job status and get result
   */
  async getTranscriptionResult(jobId: string): Promise<TranscriptionResult> {
    try {
      console.log('AWS Transcribe: Checking job status:', jobId)

      const command = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobId,
      })

      const response = await this.transcribeClient.send(command)
      const job = response.TranscriptionJob

      if (!job) {
        throw new Error('Transcription job not found')
      }

      const result: TranscriptionResult = {
        jobId,
        status: job.TranscriptionJobStatus!,
      }

      if (job.TranscriptionJobStatus === TranscriptionJobStatus.COMPLETED) {
        // Get the transcript from the result
        if (job.Transcript?.TranscriptFileUri) {
          try {
            console.log('AWS Transcribe: Fetching transcript from:', job.Transcript.TranscriptFileUri)
            
            // Try AWS provided URI first
            const transcriptResponse = await fetch(job.Transcript.TranscriptFileUri)
            
            if (!transcriptResponse.ok) {
              console.error('AWS Transcribe: Failed to fetch from AWS URI, trying S3 fallback:', transcriptResponse.status)
              
              // Fallback: Search our S3 bucket directly for the transcript file
              // AWS puts transcript files in bucket root with job name as prefix
              console.log('AWS Transcribe: Searching bucket root for job:', jobId)
              
              let transcriptFiles: any[] = []
              let attempts = 0
              const maxRetries = 3
              
              while (attempts < maxRetries && transcriptFiles.length === 0) {
                attempts++
                console.log(`AWS Transcribe: S3 search attempt ${attempts}/${maxRetries}`)
                
                // Search bucket root with job name as prefix
                const listCommand = new ListObjectsV2Command({
                  Bucket: AWS_CONFIG.s3BucketName,
                  Prefix: jobId, // Use job ID as prefix since AWS puts files directly in root
                })
                const s3Objects = await this.s3Client.send(listCommand)
                
                // Find transcript files that match our job exactly
                transcriptFiles = s3Objects.Contents?.filter(obj => 
                  obj.Key?.startsWith(jobId) && obj.Key.endsWith('.json')
                ) || []
                
                console.log('AWS Transcribe: Found transcript files in S3:', transcriptFiles.map(f => f.Key))
                
                if (transcriptFiles.length === 0 && attempts < maxRetries) {
                  console.log('AWS Transcribe: No files found, waiting 2 seconds before retry...')
                  await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
                }
              }
              
              if (transcriptFiles.length > 0) {
                // Use the first match (should be exact since we're using job ID as prefix)
                const transcriptFile = transcriptFiles[0]
                
                console.log('AWS Transcribe: Using transcript file from S3:', transcriptFile.Key)
                
                // Fetch from our S3 bucket
                const getObjectCommand = new GetObjectCommand({
                  Bucket: AWS_CONFIG.s3BucketName,
                  Key: transcriptFile.Key!,
                })
                const transcriptObject = await this.s3Client.send(getObjectCommand)
                const responseText = await transcriptObject.Body!.transformToString()
                
                console.log('AWS Transcribe: Successfully fetched from S3, length:', responseText.length)
                
                // Parse the transcript
                const transcriptData = JSON.parse(responseText)
                const transcriptText = transcriptData.results?.transcripts?.[0]?.transcript || ''
                console.log('AWS Transcribe: Extracted transcript text:', transcriptText)
                
                result.transcript = transcriptText
                
                // Calculate average confidence
                const items = transcriptData.results?.items || []
                const confidenceScores = items
                  .filter((item: any) => item.alternatives?.[0]?.confidence)
                  .map((item: any) => parseFloat(item.alternatives[0].confidence))
                
                if (confidenceScores.length > 0) {
                  result.confidence = confidenceScores.reduce((a: number, b: number) => a + b, 0) / confidenceScores.length
                  console.log('AWS Transcribe: Average confidence:', result.confidence)
                }
              } else {
                result.error = 'No transcript files found in S3 bucket after retries'
              }
            } else {
              // AWS URI worked, process normally
              const responseText = await transcriptResponse.text()
              console.log('AWS Transcribe: Raw response length:', responseText.length)
              
              try {
                const transcriptData = JSON.parse(responseText)
                const transcriptText = transcriptData.results?.transcripts?.[0]?.transcript || ''
                console.log('AWS Transcribe: Extracted transcript text:', transcriptText)
                
                result.transcript = transcriptText
                
                // Calculate average confidence
                const items = transcriptData.results?.items || []
                const confidenceScores = items
                  .filter((item: any) => item.alternatives?.[0]?.confidence)
                  .map((item: any) => parseFloat(item.alternatives[0].confidence))
                
                if (confidenceScores.length > 0) {
                  result.confidence = confidenceScores.reduce((a: number, b: number) => a + b, 0) / confidenceScores.length
                  console.log('AWS Transcribe: Average confidence:', result.confidence)
                }
              } catch (parseError) {
                console.error('AWS Transcribe: Failed to parse JSON:', parseError)
                result.error = 'Failed to parse transcript JSON'
              }
            }
          } catch (error) {
            console.error('AWS Transcribe: Failed to fetch transcript:', error)
            result.error = `Failed to retrieve transcript: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        } else {
          console.log('AWS Transcribe: No transcript file URI provided')
          result.error = 'No transcript file URI provided by AWS'
        }
      } else if (job.TranscriptionJobStatus === TranscriptionJobStatus.FAILED) {
        result.error = job.FailureReason || 'Transcription job failed'
      }

      console.log('AWS Transcribe: Job status:', result.status)
      return result
    } catch (error) {
      console.error('AWS Transcribe: Failed to get job status:', error)
      return {
        jobId,
        status: TranscriptionJobStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Clean up S3 files after transcription
   */
  async cleanupFiles(s3Key: string, jobId: string): Promise<void> {
    try {
      console.log('AWS Transcribe: Cleaning up files')
      
      // Delete original audio file
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: AWS_CONFIG.s3BucketName,
        Key: s3Key,
      }))

      // Delete transcript file - AWS puts them in bucket root with job ID as prefix
      console.log('AWS Transcribe: Searching for transcript files with prefix:', jobId)
      
      const listCommand = new ListObjectsV2Command({
        Bucket: AWS_CONFIG.s3BucketName,
        Prefix: jobId, // Search bucket root with job ID as prefix
      })
      const s3Objects = await this.s3Client.send(listCommand)
      
      console.log('AWS Transcribe: Found S3 objects for cleanup:', s3Objects.Contents?.map(obj => obj.Key))
      
      // Find all JSON transcript files that match our job ID exactly
      const transcriptFiles = s3Objects.Contents?.filter(obj => 
        obj.Key?.startsWith(jobId) && obj.Key.endsWith('.json')
      ) || []
      
      console.log('AWS Transcribe: Transcript files to delete:', transcriptFiles.map(f => f.Key))
      
      for (const transcriptFile of transcriptFiles) {
        if (transcriptFile && transcriptFile.Key) {
          console.log('AWS Transcribe: Deleting transcript file:', transcriptFile.Key)
          await this.s3Client.send(new DeleteObjectCommand({
            Bucket: AWS_CONFIG.s3BucketName,
            Key: transcriptFile.Key,
          }))
        }
      }

      console.log('AWS Transcribe: Cleanup completed')
    } catch (error) {
      console.error('AWS Transcribe: Cleanup failed:', error)
      // Don't throw - cleanup failure shouldn't break the flow
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop()
    switch (ext) {
      case 'mp3': return 'audio/mpeg'
      case 'wav': return 'audio/wav'
      case 'm4a': return 'audio/mp4'
      case 'aac': return 'audio/aac'
      case 'ogg': return 'audio/ogg'
      case 'flac': return 'audio/flac'
      default: return 'audio/mpeg'
    }
  }

  /**
   * Get media format for AWS Transcribe
   */
  private getMediaFormat(fileName: string): MediaFormat {
    const ext = fileName.toLowerCase().split('.').pop()
    switch (ext) {
      case 'mp3': return MediaFormat.MP3
      case 'wav': return MediaFormat.WAV
      case 'm4a': return MediaFormat.M4A
      case 'aac': return MediaFormat.MP4
      case 'ogg': return MediaFormat.OGG
      case 'flac': return MediaFormat.FLAC
      default: return MediaFormat.MP3
    }
  }
}

/**
 * Utility function to check if AWS Transcribe is available
 */
export function isTranscribeAvailable(): boolean {
  return validateAWSConfig()
}