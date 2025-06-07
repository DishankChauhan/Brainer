import { TranscribeClient } from '@aws-sdk/client-transcribe'
import { S3Client } from '@aws-sdk/client-s3'

// AWS Configuration
export const AWS_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3BucketName: process.env.AWS_S3_BUCKET_NAME || 'brainer-audio-uploads',
}

// Validate AWS configuration
export function validateAWSConfig(): boolean {
  return !!(
    AWS_CONFIG.accessKeyId && 
    AWS_CONFIG.secretAccessKey && 
    AWS_CONFIG.s3BucketName
  )
}

// Create AWS clients
export function createAWSClients() {
  if (!validateAWSConfig()) {
    throw new Error('AWS configuration is incomplete. Please check your environment variables.')
  }

  const credentials = {
    accessKeyId: AWS_CONFIG.accessKeyId!,
    secretAccessKey: AWS_CONFIG.secretAccessKey!,
  }

  const transcribeClient = new TranscribeClient({
    region: AWS_CONFIG.region,
    credentials,
  })

  const s3Client = new S3Client({
    region: AWS_CONFIG.region,
    credentials,
  })

  return { transcribeClient, s3Client }
}

// AWS Service Status
export function getAWSServiceStatus() {
  const isConfigured = validateAWSConfig()
  
  return {
    configured: isConfigured,
    region: AWS_CONFIG.region,
    s3Bucket: AWS_CONFIG.s3BucketName,
    services: {
      transcribe: isConfigured,
      s3: isConfigured,
    },
    message: isConfigured 
      ? 'AWS services are properly configured' 
      : 'AWS configuration missing. Voice transcription will use placeholder mode.'
  }
} 