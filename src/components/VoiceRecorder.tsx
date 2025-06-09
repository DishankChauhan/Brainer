'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Square, Play, Pause, Trash2, Upload } from 'lucide-react'

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => Promise<void>
  className?: string
}

export function VoiceRecorder({ onRecordingComplete, className = '' }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isCheckingPermission, setIsCheckingPermission] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Check microphone permission on mount
  useEffect(() => {
    checkInitialPermission()
    return () => {
      cleanup()
    }
  }, [])

  const checkMicrophonePermission = async () => {
    if (isCheckingPermission) return // Prevent multiple simultaneous requests
    
    setIsCheckingPermission(true)
    
    try {
      console.log('Requesting microphone permission...')
      
      // Try to access the microphone to trigger permission request
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // If successful, set permission to true and clean up the stream
      setHasPermission(true)
      stream.getTracks().forEach(track => track.stop())
      
      console.log('Microphone permission granted!')
      
    } catch (error) {
      console.error('Microphone permission denied or error:', error)
      setHasPermission(false)
      
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Microphone access was denied. Please click the microphone icon in your browser\'s address bar and allow access, then try again.')
        } else if (error.name === 'NotFoundError') {
          alert('No microphone found. Please make sure you have a microphone connected.')
        } else {
          alert('Error accessing microphone: ' + error.message)
        }
      }
    } finally {
      setIsCheckingPermission(false)
    }
  }

  const checkInitialPermission = async () => {
    try {
      // Check current permission status without requesting
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      setHasPermission(permission.state === 'granted')
      
      permission.addEventListener('change', () => {
        setHasPermission(permission.state === 'granted')
      })
    } catch (error) {
      console.warn('Permission API not supported, will request permission when needed')
      setHasPermission(null)
    }
  }

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
  }

  const startRecording = async () => {
    try {
      cleanup()
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      })
      
      streamRef.current = stream
      chunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })
      
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)
      setHasPermission(true)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error accessing microphone:', error)
      setHasPermission(false)
      alert('Unable to access microphone. Please check your permissions.')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const playRecording = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const discardRecording = () => {
    setAudioBlob(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setRecordingTime(0)
    setIsPlaying(false)
  }

  const uploadRecording = async () => {
    if (!audioBlob) return

    setIsUploading(true)
    try {
      await onRecordingComplete(audioBlob, recordingTime)
      discardRecording() // Clear the recording after successful upload
    } catch (error) {
      console.error('Failed to upload recording:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Show permission request if needed
  if (hasPermission === false) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <MicOff className="w-5 h-5 text-red-500" />
          <div>
            <div className="font-medium text-red-900">Microphone Access Required</div>
            <div className="text-sm text-red-700">Please allow microphone access to record voice notes.</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={checkMicrophonePermission}
            disabled={isCheckingPermission}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
          >
            {isCheckingPermission ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Requesting Permission...
              </>
            ) : (
              'Request Microphone Access'
            )}
          </button>
          
          <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
            💡 <strong>Tip:</strong> If the popup doesn't appear, look for a microphone icon in your browser's address bar and click "Allow"
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      {/* Recording Controls */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        )}

        {isRecording && (
          <>
            {!isPaused ? (
              <button
                onClick={pauseRecording}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            ) : (
              <button
                onClick={resumeRecording}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            )}
            
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          </>
        )}
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 text-red-600">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
            {isPaused && <span className="text-sm text-gray-500">(Paused)</span>}
          </div>
          <div className="text-sm text-gray-600 mt-1">Recording in progress...</div>
        </div>
      )}

      {/* Playback Controls */}
      {audioBlob && !isRecording && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="font-medium text-gray-900">Recording Complete</div>
            <div className="text-sm text-gray-600">Duration: {formatTime(recordingTime)}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={playRecording}
              className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={discardRecording}
              className="flex items-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
            >
              <Trash2 className="w-3 h-3" />
              Discard
            </button>

            <button
              onClick={uploadRecording}
              disabled={isUploading}
              className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Upload className="w-3 h-3" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      )}

      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  )
} 