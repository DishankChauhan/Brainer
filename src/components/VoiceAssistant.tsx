'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Brain, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

// Global declarations for Speech API
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface VoiceAssistantProps {
  notes: Array<{
    id: string
    title: string
    content: string
    createdAt: string
    tags: { id: string; name: string; color: string }[]
  }>
  onNoteSelect: (noteId: string) => void
  onCreateNote?: (title: string, content: string, tags: string[]) => Promise<any>
  onGenerateSummary?: (noteId: string) => Promise<void>
  userId?: string
  isFirstTime?: boolean
  className?: string
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  text: string
  timestamp: Date
}

export function VoiceAssistant({ 
  notes, 
  onNoteSelect, 
  onCreateNote, 
  onGenerateSummary, 
  userId, 
  isFirstTime, 
  className = '' 
}: VoiceAssistantProps) {
  const { getAuthToken } = useAuth()
  
  // Core states
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [voicesReady, setVoicesReady] = useState(false)

  // Refs
  const recognitionRef = useRef<any>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Initialize voices
  useEffect(() => {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
      console.log('Available voices:', voices.length)
        if (voices.length > 0) {
        setVoicesReady(true)
        console.log('Voices loaded:', voices.map(v => `${v.name} (${v.lang})`))
        }
      }

      // Load voices immediately
      loadVoices()
      
      // Listen for voices changed event
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
      
      // Fallback - try loading after delay
      setTimeout(loadVoices, 1000)
    }

      return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      }
    }
  }, [])

  // Enhanced speak function
  const speak = (text: string) => {
    if (!speechEnabled || !text.trim()) {
      console.log('Speech skipped - disabled or empty text')
      return
    }

    if (!('speechSynthesis' in window)) {
      console.log('Speech synthesis not supported')
      return
    }

    // Cancel any current speech
    window.speechSynthesis.cancel()
    
    console.log('Speaking:', text.substring(0, 50) + '...')

    const utterance = new SpeechSynthesisUtterance(text)
    utteranceRef.current = utterance
    
    // Configure speech settings
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices()
    const englishVoices = voices.filter(voice => 
      voice.lang.includes('en') && 
      (voice.lang.includes('US') || voice.lang.includes('GB'))
    )
    
    if (englishVoices.length > 0) {
      // Prefer certain voices if available
      const preferredVoices = ['Samantha', 'Victoria', 'Allison', 'Alex', 'Google US English']
      const preferredVoice = preferredVoices.find(name => 
        englishVoices.some(voice => voice.name.includes(name))
      )
      
      if (preferredVoice) {
        const voice = englishVoices.find(v => v.name.includes(preferredVoice))
        if (voice) {
          utterance.voice = voice
          console.log('Using voice:', voice.name)
        }
    } else {
        utterance.voice = englishVoices[0]
        console.log('Using default English voice:', englishVoices[0].name)
      }
    }

    utterance.onstart = () => {
      console.log('Speech started')
      setIsSpeaking(true)
    }
    
    utterance.onend = () => {
      console.log('Speech ended')
      setIsSpeaking(false)
      utteranceRef.current = null
    }
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event.error)
      setIsSpeaking(false)
      utteranceRef.current = null
    }

    // Start speaking
    try {
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      console.error('Error starting speech:', error)
      setIsSpeaking(false)
    }
  }

  // Initialize speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.log('Speech recognition not supported')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        
        if (recognitionRef.current) {
          recognitionRef.current.continuous = false
          recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

          recognitionRef.current.onstart = () => {
        console.log('Speech recognition started')
            setIsListening(true)
          }
          
          recognitionRef.current.onend = () => {
        console.log('Speech recognition ended')
            setIsListening(false)
          }
          
          recognitionRef.current.onresult = (event: any) => {
              const transcript = event.results[0]?.item(0)?.transcript
              if (transcript) {
          console.log('Speech result:', transcript)
                handleUserMessage(transcript)
            }
          }

          recognitionRef.current.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error)
            setIsListening(false)
            
        if (event.error === 'not-allowed') {
          console.error('Microphone permission denied')
          alert('Please allow microphone access to use voice features')
              } else if (event.error === 'no-speech') {
          console.log('No speech detected')
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.log('Error stopping recognition:', e)
        }
      }
    }
  }, [])

  // First-time welcome
  useEffect(() => {
    if (isFirstTime && userId && isOpen) {
      setTimeout(() => {
        const welcomeText = "Hello! I'm Brainer, your intelligent note-taking assistant. I can help you create, organize, and find your notes using voice commands. Click the microphone and tell me what you need!"
        
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          text: welcomeText,
          timestamp: new Date()
        }
        setMessages([welcomeMessage])
        
        // Speak after a delay to ensure voices are ready
        setTimeout(() => {
          console.log('Speaking welcome message')
          speak(welcomeText)
        }, 1500)
      }, 1000)
    }
  }, [isFirstTime, userId, isOpen, voicesReady])

  const startListening = () => {
    if (!recognitionRef.current || isListening) return
    
    console.log('Starting to listen...')
    
    try {
          recognitionRef.current.start()
        } catch (error) {
      console.error('Failed to start speech recognition:', error)
          setIsListening(false)
        }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      console.log('Stopping listening...')
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error('Failed to stop speech recognition:', error)
      }
      setIsListening(false)
    }
  }

  const handleUserMessage = async (text: string) => {
    console.log('Processing user message:', text)

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/voice-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: text,
          notes: notes,
          userId: userId,
          language: 'english',
          context: 'Brainer is an intelligent note-taking app. Respond naturally and conversationally in English.'
        }),
      })

      if (!response.ok) throw new Error('Failed to process query')

      const result = await response.json()
      console.log('API Response:', result)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: result.response || "I'm here to help with your notes!",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Speak the response
      if (speechEnabled && result.response) {
        console.log('About to speak response:', result.response)
        setTimeout(() => {
          speak(result.response)
        }, 500)
      }

      // Handle note creation
      if (result.action === 'create_note' && result.noteData && onCreateNote) {
        try {
          await onCreateNote(
            result.noteData.title || 'New Note',
            result.noteData.content || '',
            result.noteData.tags || []
          )
          
          const successText = "Perfect! I've created your note successfully. You can find it in your notes list."
          
          const successMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'assistant',
            text: successText,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, successMessage])
          
          if (speechEnabled) {
            setTimeout(() => speak(successText), 1000)
          }
        } catch (error) {
          console.error('Failed to create note:', error)
          const errorText = "I had trouble creating that note. Please try again."
          speak(errorText)
        }
      }

      // Auto-select found notes
      if (result.foundNotes?.length > 0) {
        setTimeout(() => onNoteSelect(result.foundNotes[0]), 1000)
      }

    } catch (error) {
      console.error('Error processing voice query:', error)
      const errorText = "Sorry, I couldn't process that request. Please try again."
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: errorText,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      
      if (speechEnabled) {
        setTimeout(() => speak(errorText), 500)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget
      const text = input.value.trim()
      if (text) {
        handleUserMessage(text)
        input.value = ''
      }
    }
  }

  const toggleSpeech = () => {
    const newSpeechEnabled = !speechEnabled
    setSpeechEnabled(newSpeechEnabled)
    
    if (!newSpeechEnabled && isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
    
    // Announce the change
    setTimeout(() => {
      speak(newSpeechEnabled ? "Voice responses enabled" : "Voice responses disabled")
    }, 200)
  }

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    if (utteranceRef.current) {
      utteranceRef.current = null
    }
  }

  // Test speech function
  const testSpeech = () => {
    speak("Hello! This is a test of the speech system. Can you hear me?")
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {}
      }
      
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      
      if (utteranceRef.current) {
        utteranceRef.current = null
      }
    }
  }, [])

  // Cleanup when closing
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop()
        } catch (e) {}
      }
      
      stopSpeaking()
      setIsListening(false)
    }
  }, [isOpen])

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center group ${className}`}
      >
        <Brain className="w-6 h-6" />
        <div className="absolute right-16 bg-gray-900 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Voice Assistant
        </div>
      </button>
    )
  }

  return (
    <div className={`fixed bottom-6 right-6 w-96 h-96 bg-white rounded-lg shadow-2xl border flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-blue-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-900">Brainer Assistant</span>
          {!voicesReady && (
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Loading voices..."></div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={testSpeech}
            className="p-1 rounded transition-colors text-gray-600 bg-gray-100 hover:bg-gray-200"
            title="Test speech"
          >
            🔊
          </button>
          
          <button
            onClick={toggleSpeech}
            className={`p-1 rounded transition-colors ${
              speechEnabled ? 'text-blue-600 bg-blue-100' : 'text-gray-400 bg-gray-100'
            }`}
            title={speechEnabled ? 'Voice enabled' : 'Voice disabled'}
          >
            {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 font-bold text-lg"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
        {messages.length === 0 && !isFirstTime && (
          <div className="text-center text-gray-500 text-sm">
            <Brain className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>Hi! I'm Brainer, your voice assistant</p>
            <p>Click the microphone and tell me what you need!</p>
            <div className="mt-3 space-y-1 text-xs">
              <p>Try saying:</p>
              <p>"Create a note about my meeting"</p>
              <p>"Find my work notes"</p>
              <p>"What notes do I have?"</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 border'
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <p className={`text-xs mt-1 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 border p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Processing...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type your message or click the microphone..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={handleTextInput}
          />
          
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className={`p-2 rounded-lg transition-colors ${
              isListening
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
              title="Stop speaking"
            >
              <Volume2 className="w-4 h-4 animate-pulse" />
            </button>
          )}
        </div>

        {isListening && (
          <div className="mt-2 text-center">
            <div className="flex items-center justify-center gap-2 text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs">Listening... Speak now!</span>
            </div>
          </div>
        )}

        {isSpeaking && (
          <div className="mt-2 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-green-600">
              <Volume2 className="w-3 h-3 animate-pulse" />
              <span>Speaking...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 