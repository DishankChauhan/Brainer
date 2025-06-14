import admin from 'firebase-admin'

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Validate required environment variables
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing Firebase environment variables: ${missingVars.join(', ')}`)
    console.error(`📝 To fix this:`)
    console.error(`1. Copy .env.local.example to .env.local`)
    console.error(`2. Add your Firebase service account credentials`)
    console.error(`3. Or see PRODUCTION_SETUP.md for detailed instructions`)
    throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`)
  }

  // Production configuration using environment variables
  const firebaseConfig = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    })
    console.log('✅ Firebase Admin SDK initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error)
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export interface TokenVerificationResult {
  success: boolean
  uid?: string
  email?: string
  error?: string
}

export async function verifyFirebaseToken(token: string): Promise<TokenVerificationResult> {
  try {
    if (!token) {
      return {
        success: false,
        error: 'No token provided'
      }
    }

    // Verify the token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token)
    
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email || undefined
    }
  } catch (error) {
    // Handle specific Firebase errors without exposing sensitive details
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return {
          success: false,
          error: 'Token has expired'
        }
      }
      
      if (error.message.includes('invalid')) {
        return {
          success: false,
          error: 'Invalid token'
        }
      }
      
      if (error.message.includes('revoked')) {
        return {
          success: false,
          error: 'Token has been revoked'
        }
      }
    }

    return {
      success: false,
      error: 'Token verification failed'
    }
  }
}

export { admin } 