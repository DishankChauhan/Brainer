'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, Mic, MicOff, Volume2, VolumeX, Loader2, Brain } from 'lucide-react'

// Add type declarations for Speech API
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
  foundNotes?: string[]
}

export function VoiceAssistant({ notes, onNoteSelect, onCreateNote, onGenerateSummary, userId, isFirstTime, className = '' }: VoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState<'english' | 'hindi'>('english')
  const [pendingSummaryNoteId, setPendingSummaryNoteId] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    // Check if we're running on HTTPS or localhost (required for speech recognition)
    const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost'
    
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        
        // Update language setting when currentLanguage changes
        recognitionRef.current.lang = currentLanguage === 'hindi' ? 'hi-IN' : 'en-US'

        recognitionRef.current.onstart = () => {
          setIsListening(true)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0]?.item(0)?.transcript
          if (transcript) {
            // Auto-detect language and update preference
            const isHindiTranscript = /[\u0900-\u097F]/.test(transcript) ||
                                     transcript.toLowerCase().includes('namaste') ||
                                     transcript.toLowerCase().includes('नोट') ||
                                     transcript.toLowerCase().includes('खोज') ||
                                     transcript.toLowerCase().includes('बना') ||
                                     transcript.toLowerCase().includes('मदद')
            
            if (isHindiTranscript && currentLanguage !== 'hindi') {
              setCurrentLanguage('hindi')
            } else if (!isHindiTranscript && currentLanguage !== 'english') {
              setCurrentLanguage('english')
            }
            
            handleUserMessage(transcript)
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
          setIsRetrying(false)
          
          let errorMessage = ''
          
          switch (event.error) {
            case 'network':
              if (!isSecureContext) {
                errorMessage = 'Speech recognition requires HTTPS. Please use the HTTPS development server or type your message instead.'
              } else {
                errorMessage = 'Network error: Speech recognition service unavailable. Please check your connection and try again.'
              }
              break
            case 'not-allowed':
              errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.'
              setHasPermission(false)
              break
            case 'service-not-allowed':
              errorMessage = 'Speech recognition service is not available. Please try typing your message instead.'
              break
            case 'no-speech':
              errorMessage = 'No speech detected. Please speak louder or try again.'
              break
            case 'audio-capture':
              errorMessage = 'Audio capture failed. Please check your microphone and try again.'
              break
            case 'language-not-supported':
              errorMessage = 'Language not supported. Please check your browser language settings.'
              break
            default:
              errorMessage = `Speech recognition error: ${event.error}. Please try typing your message instead.`
          }
          
          setSpeechError(errorMessage)
          
          // Clear error after 8 seconds for longer messages
          setTimeout(() => {
            setSpeechError(null)
          }, 8000)
        }
      }
    } else {
      // Speech recognition not supported
      setSpeechError('Speech recognition is not supported in this browser. Please use Chrome or Edge and type your messages.')
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [currentLanguage])

  // Separate effect to update speech recognition language when currentLanguage changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = currentLanguage === 'hindi' ? 'hi-IN' : 'en-US'
    }
  }, [currentLanguage])

  const checkMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setHasPermission(true)
    } catch (error) {
      setHasPermission(false)
    }
  }

  const startListening = async () => {
    if (!hasPermission) {
      await checkMicrophonePermission()
    }

    if (recognitionRef.current && hasPermission !== false) {
      try {
        setSpeechError(null) // Clear any previous errors
        setIsRetrying(false)
        recognitionRef.current.start()
      } catch (error) {
        console.error('Failed to start speech recognition:', error)
        setSpeechError('Failed to start speech recognition. Please try again or type your message.')
      }
    }
  }

  const retryListening = async () => {
    setIsRetrying(true)
    setSpeechError(null)
    
    // Wait a moment before retrying
    setTimeout(async () => {
      await startListening()
    }, 1000)
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const speak = useCallback((text: string, language?: 'english' | 'hindi') => {
    if (!speechEnabled || !synthRef.current) return

    // Cancel any ongoing speech
    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    
    // Set language-specific voice settings
    if (language === 'hindi' || currentLanguage === 'hindi') {
      utterance.lang = 'hi-IN' // Hindi India
      utterance.rate = 0.8
    } else {
      utterance.lang = 'en-US' // English US
      utterance.rate = 0.9
    }
    
    utterance.pitch = 1
    utterance.volume = 0.8
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    // Try to find a voice that supports the language
    const voices = synthRef.current.getVoices()
    const targetLang = language === 'hindi' || currentLanguage === 'hindi' ? 'hi' : 'en'
    const matchingVoice = voices.find(voice => voice.lang.startsWith(targetLang))
    
    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

    synthRef.current.speak(utterance)
  }, [speechEnabled, currentLanguage])

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  const handleUserMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)

    try {
      // Detect Hindi in user input
      const isHindiInput = /[\u0900-\u097F]/.test(text) || 
                          text.toLowerCase().includes('namaste') ||
                          text.toLowerCase().includes('hindi') ||
                          text.toLowerCase().includes('हिंदी')

      if (isHindiInput && currentLanguage !== 'hindi') {
        setCurrentLanguage('hindi')
      }

      // Process the user's query with AI
      const response = await fetch('/api/voice-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: text,
          notes: notes,
          userId: userId
        }),
      })

      if (!response.ok) throw new Error('Failed to process query')

      const result = await response.json()
      console.log('AI Response:', result) // Debug log

      // Update current language based on AI response
      if (result.language) {
        setCurrentLanguage(result.language)
      }

      // Create assistant message with the natural language response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: result.response || "I'm here to help you!",
        timestamp: new Date(),
        foundNotes: result.foundNotes || []
      }

      setMessages(prev => [...prev, assistantMessage])

      // Handle different actions
      if (result.action === 'create_note' && result.noteData && onCreateNote) {
        try {
          console.log('Creating note:', result.noteData)
          const newNote = await onCreateNote(
            result.noteData.title || 'New Note',
            result.noteData.content || '',
            result.noteData.tags || []
          )
          
          // Show success message in appropriate language
          const successText = result.language === 'hindi' || currentLanguage === 'hindi'
            ? `✅ बहुत बढ़िया! मैंने "${result.noteData.title || 'नया नोट'}" नोट बना दिया है। क्या आप इसका AI सारांश भी चाहते हैं?`
            : `✅ Great! I've created the note "${result.noteData.title || 'New Note'}". Would you like me to generate an AI summary for it?`
          
          const successMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'assistant',
            text: successText,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, successMessage])
          
          // Store the note ID for potential summary generation
          if (newNote?.id) {
            setPendingSummaryNoteId(newNote.id)
          }
          
          // Speak success message in appropriate language
          if (speechEnabled) {
            const speechText = result.language === 'hindi' || currentLanguage === 'hindi'
              ? `नोट तैयार हो गया! क्या आप AI सारांश चाहते हैं?`
              : `Note created successfully! Would you like an AI summary?`
            speak(speechText, result.language === 'hindi' || currentLanguage === 'hindi' ? 'hindi' : 'english')
          }
          
        } catch (error) {
          console.error('Failed to create note:', error)
          const errorText = result.language === 'hindi' || currentLanguage === 'hindi'
            ? "माफ करें, नोट बनाने में समस्या हुई। कृपया फिर से कोशिश करें।"
            : "Sorry, I couldn't create the note. Please try again."
          
          const errorMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'assistant',
            text: errorText,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMessage])
        }
      }

      // Handle summary generation request
      if (result.askSummary && pendingSummaryNoteId && 
          (text.toLowerCase().includes('yes') || text.toLowerCase().includes('हाँ') || 
           text.toLowerCase().includes('जी') || text.toLowerCase().includes('summary'))) {
        
        if (onGenerateSummary) {
          try {
            await onGenerateSummary(pendingSummaryNoteId)
            const summaryText = result.language === 'hindi' || currentLanguage === 'hindi'
              ? "🧠 AI सारांश तैयार हो रहा है... कुछ सेकंड रुकें!"
              : "🧠 Generating AI summary... Please wait a moment!"
            
            const summaryMessage: Message = {
              id: (Date.now() + 3).toString(),
              type: 'assistant',
              text: summaryText,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, summaryMessage])
            setPendingSummaryNoteId(null)
          } catch (error) {
            console.error('Failed to generate summary:', error)
          }
        }
      }

      // Speak the AI response in the correct language
      if (speechEnabled && result.response) {
        speak(result.response, result.language === 'hindi' || currentLanguage === 'hindi' ? 'hindi' : 'english')
      }

      // Auto-select first found note if any
      if (result.foundNotes && result.foundNotes.length > 0) {
        setTimeout(() => {
          onNoteSelect(result.foundNotes[0])
        }, 1000)
      }

    } catch (error) {
      console.error('Error processing voice query:', error)
      const errorText = currentLanguage === 'hindi'
        ? "माफ करें, मुझे कुछ समस्या हुई। कृपया फिर से कोशिश करें।"
        : "I'm sorry, I couldn't process your request. Please try again."
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: errorText,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      
      if (speechEnabled) {
        const errorSpeech = currentLanguage === 'hindi' 
          ? "माफ करें, कुछ गलत हुआ।" 
          : "Sorry, something went wrong."
        speak(errorSpeech, currentLanguage)
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Handle first-time user welcome
  useEffect(() => {
    if (isFirstTime && userId && typeof window !== 'undefined') {
      setTimeout(() => {
        setIsOpen(true)
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          text: "नमस्ते! मैं Brainer हूँ, आपका AI असिस्टेंट। 🧠 मैं आपकी नोट्स बनाने, खोजने और ऐप का उपयोग करने में मदद कर सकता हूँ। आप मुझसे हिंदी या English में बात कर सकते हैं। कुछ भी पूछें!",
          timestamp: new Date()
        }
        setMessages([welcomeMessage])
        
        if (speechEnabled) {
          speak("Hello! I'm Brainer, your AI assistant. I can help you create notes, find information, and navigate the app. You can talk to me in Hindi or English. Ask me anything!", 'english')
        }
      }, 1000)
    }
  }, [isFirstTime, userId, speechEnabled])

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
          <span className="font-medium text-blue-900">Voice Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className={`p-1 rounded ${speechEnabled ? 'text-blue-600' : 'text-gray-400'}`}
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
            <p>Hi! I'm Brainer, your AI assistant! 🧠</p>
            <p>I can speak <span className="font-semibold">English</span> and <span className="font-semibold">हिंदी</span></p>
            <div className="mt-3 space-y-1 text-xs">
              <p>Try saying:</p>
              <p>"Create a note about my meeting"</p>
              <p>"Find notes about work"</p>
              <p>"How do I upload voice notes?"</p>
            </div>
          </div>
        )}

        {/* Quick Action Buttons */}
        {messages.length === 0 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => handleUserMessage("How do I create notes in this app?")}
              className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs transition-colors"
            >
              📝 How to create notes?
            </button>
            <button
              onClick={() => handleUserMessage("Explain voice transcription feature")}
              className="p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-xs transition-colors"
            >
              🎤 Voice features?
            </button>
            <button
              onClick={() => handleUserMessage("What is AI summary?")}
              className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs transition-colors"
            >
              🧠 AI Summary?
            </button>
            <button
              onClick={() => handleUserMessage("Create a note about my daily tasks")}
              className="p-3 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg text-xs transition-colors"
            >
              ➕ Create sample note
            </button>
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
                {formatTime(message.timestamp)}
              </p>
              {message.foundNotes && message.foundNotes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Found notes:</p>
                  {message.foundNotes.slice(0, 3).map((noteId) => {
                    const note = notes.find(n => n.id === noteId)
                    return note ? (
                      <button
                        key={noteId}
                        onClick={() => onNoteSelect(noteId)}
                        className="block w-full text-left text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded mb-1 transition-colors"
                      >
                        {note.title}
                      </button>
                    ) : null
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 border p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white rounded-b-lg">
        {/* Speech Error Display */}
        {speechError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 text-red-500 mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-sm text-red-800">{speechError}</p>
                
                {/* HTTPS Setup Instructions */}
                {speechError.includes('HTTPS') && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <p className="font-semibold text-yellow-800 mb-1">Quick Fix:</p>
                    <p className="text-yellow-700 mb-1">1. Stop the server (Ctrl+C)</p>
                    <p className="text-yellow-700 mb-1">2. Run: <code className="bg-yellow-200 px-1 rounded">npm run dev:https</code></p>
                    <p className="text-yellow-700">3. Accept the security warning in your browser</p>
                  </div>
                )}
                
                {speechError.includes('network') && !speechError.includes('HTTPS') && (
                  <button
                    onClick={retryListening}
                    disabled={isRetrying}
                    className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs rounded transition-colors flex items-center gap-1"
                  >
                    {isRetrying ? (
                      <>
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        Retrying...
                      </>
                    ) : (
                      'Retry Voice Input'
                    )}
                  </button>
                )}
                
                {/* Browser Compatibility Info */}
                {speechError.includes('not supported') && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <p className="font-semibold text-blue-800 mb-1">Supported Browsers:</p>
                    <p className="text-blue-700">✅ Chrome, Edge, Safari (latest versions)</p>
                    <p className="text-blue-700">❌ Firefox (limited support)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type your message or use voice..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={handleTextInput}
          />
          
          {hasPermission === false ? (
            <button
              onClick={checkMicrophonePermission}
              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            >
              <MicOff className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing || isRetrying}
              className={`p-2 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              } disabled:opacity-50`}
            >
              <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
            </button>
          )}

          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
            >
              <Volume2 className="w-4 h-4 animate-pulse" />
            </button>
          )}
        </div>

        {isListening && (
          <div className="mt-2 text-center">
            <div className="flex items-center justify-center gap-2 text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs">Listening...</span>
            </div>
          </div>
        )}

        {isRetrying && (
          <div className="mt-2 text-center">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs">Retrying voice input...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 