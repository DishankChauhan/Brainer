import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'

export function useFileUpload() {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = async (file: File, type: 'voice' | 'screenshot') => {
    if (!user?.uid) {
      throw new Error('User not authenticated')
    }

    console.log('useFileUpload: Starting upload', { fileName: file.name, type, userId: user.uid })

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.uid)
      formData.append('type', type)

      console.log('useFileUpload: Making API call to /api/upload')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const note = await response.json()
      console.log('useFileUpload: Upload successful, note created:', note.id)
      
      return note
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      console.error('useFileUpload: Upload error:', errorMessage)
      setError(errorMessage)
      throw err
    } finally {
      setUploading(false)
    }
  }

  return {
    uploadFile,
    uploading,
    error,
    clearError: () => setError(null)
  }
} 