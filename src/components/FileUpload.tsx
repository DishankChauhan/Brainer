'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const fileType = getFileType(file)
      if (!fileType) continue

      const uploadingFile: UploadingFile = {
        file,
        type: fileType,
        progress: 0,
        status: 'uploading'
      }

      setUploadingFiles(prev => [...prev, uploadingFile])

      try {
        await onFileUpload(file, fileType)
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
    },
    multiple: true
  })

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-indigo-500 bg-indigo-50' 
            : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-25'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
        
        {isDragActive ? (
          <p className="text-indigo-600 font-medium">Drop files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">
              <span className="font-medium">Click to upload</span> or drag and drop
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Mic className="w-4 h-4" />
                <span>Voice: MP3, WAV</span>
              </div>
              <div className="flex items-center gap-1">
                <Camera className="w-4 h-4" />
                <span>Images: PNG, JPG</span>
              </div>
            </div>
          </div>
        )}
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
                            : 'bg-indigo-500'
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