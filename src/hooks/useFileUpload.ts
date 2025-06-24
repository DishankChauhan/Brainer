import { useState } from 'react'
import { createWorker, Worker, ImageLike } from 'tesseract.js'
import { useAuth } from '@/components/AuthProvider'

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const { getAuthToken } = useAuth()

  const processImage = async (file: File): Promise<string> => {
    console.log('Processing image on client side...')
    
    try {
      // Create worker
      const worker = await createWorker()
      
      // Convert file to URL for Tesseract
      const imageUrl = URL.createObjectURL(file)
      
      // Recognize text
      const result = await worker.recognize(imageUrl)
      
      // Clean up
      URL.revokeObjectURL(imageUrl)
      await worker.terminate()
      
      return result.data.text
    } catch (error) {
      console.error('Client-side OCR failed:', error)
      return '' // Return empty string if OCR fails
    }
  }

  const uploadFile = async (file: File, type: 'voice' | 'screenshot') => {
    console.log('useFileUpload: Making API call to /api/upload')
    setIsUploading(true)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      // If it's a screenshot, process it with OCR first
      if (type === 'screenshot') {
        const extractedText = await processImage(file)
        formData.append('extractedText', extractedText)
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('useFileUpload: Upload error:', error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  return {
    uploadFile,
    isUploading
  }
} 