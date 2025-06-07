'use client'

import React, { useCallback, useState, useRef } from 'react'
import { Upload, Mic, Camera, X, FileAudio, Image as ImageIcon } from 'lucide-react'

interface FileUploadProps {
  onFileUpload: (file: File, type: 'voice' | 'screenshot') => Promise<void>
  className?: string
}

interface UploadingFile {
  file: File
  type: 'voice' | 'screenshot'
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

export function FileUpload({ onFileUpload, className = '' }: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const voiceInputRef = useRef<HTMLInputElement>(null)
  const screenshotInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (files: FileList | null, type: 'voice' | 'screenshot') => {
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      const fileType = getFileType(file)
      if (fileType !== type) {
        console.error(`Invalid file type for ${type} upload:`, file.type)
        continue
      }

      const uploadingFile: UploadingFile = {
        file,
        type,
        progress: 0,
        status: 'uploading'
      }

      setUploadingFiles(prev => [...prev, uploadingFile])

      try {
        await onFileUpload(file, type)
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { ...f, status: 'completed', progress: 100 }
              : f
          )
        )
        
        // Remove completed uploads after 3 seconds
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.file !== file))
        }, 3000)
      } catch (error) {
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
              : f
          )
        )
      }
    }
  }, [onFileUpload])

  const getFileType = (file: File): 'voice' | 'screenshot' | null => {
    if (file.type.startsWith('audio/')) return 'voice'
    if (file.type.startsWith('image/')) return 'screenshot'
    return null
  }

  const getFileIcon = (type: 'voice' | 'screenshot') => {
    return type === 'voice' ? FileAudio : ImageIcon
  }

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file))
  }

  const handleVoiceClick = () => {
    voiceInputRef.current?.click()
  }

  const handleScreenshotClick = () => {
    screenshotInputRef.current?.click()
  }

  return (
    <div className={className}>
      {/* Upload Buttons */}
      <div className="space-y-3">
        {/* Voice Recording Button */}
        <button
          onClick={handleVoiceClick}
          className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-colors group"
        >
          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium text-blue-900">Record Voice Note</div>
            <div className="text-sm text-blue-700">Upload audio files • MP3, WAV, M4A</div>
          </div>
          <Upload className="w-4 h-4 text-blue-600 opacity-60" />
        </button>

        {/* Hidden Voice Input */}
        <input
          ref={voiceInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.aac"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'voice')}
        />

        {/* Screenshot Upload Button */}
        <button
          onClick={handleScreenshotClick}
          className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-green-300 rounded-lg bg-green-50 hover:bg-green-100 hover:border-green-400 transition-colors group"
        >
          <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center group-hover:bg-green-600 transition-colors">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium text-green-900">Upload Screenshot</div>
            <div className="text-sm text-green-700">Extract text from images • PNG, JPG, JPEG</div>
          </div>
          <Upload className="w-4 h-4 text-green-600 opacity-60" />
        </button>

        {/* Hidden Screenshot Input */}
        <input
          ref={screenshotInputRef}
          type="file"
          accept="image/*,.png,.jpg,.jpeg,.gif,.bmp"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'screenshot')}
        />
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((uploadingFile, index) => {
            const Icon = getFileIcon(uploadingFile.type)
            return (
              <div
                key={index}
                className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm"
              >
                <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadingFile.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          uploadingFile.status === 'error'
                            ? 'bg-red-500'
                            : uploadingFile.status === 'completed'
                            ? 'bg-green-500'
                            : uploadingFile.type === 'voice'
                            ? 'bg-blue-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${uploadingFile.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 capitalize">
                      {uploadingFile.status === 'uploading' && 'Uploading...'}
                      {uploadingFile.status === 'processing' && 'Processing...'}
                      {uploadingFile.status === 'completed' && 'Complete!'}
                      {uploadingFile.status === 'error' && 'Error'}
                    </span>
                  </div>
                  {uploadingFile.error && (
                    <p className="text-xs text-red-600 mt-1">{uploadingFile.error}</p>
                  )}
                </div>
                <button
                  onClick={() => removeUploadingFile(uploadingFile.file)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
} 