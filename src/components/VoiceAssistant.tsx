'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Brain, Mic, MicOff, Volume2, VolumeX, MessageCircle } from 'lucide-react'
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
  
  // States
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState<'english' | 'hindi'>('english')
  const [isWakeWordListening, setIsWakeWordListening] = useState(false)
  const [isStartingWakeWord, setIsStartingWakeWord] = useState(false)
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)

  // Refs
  const recognitionRef = useRef<any>(null)
  const wakeWordRecognitionRef = useRef<any>(null)
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const wakeWordTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Clean text for speech (remove punctuation that sounds bad)
  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\b(um|uh|er|ah)\b/gi, '') // Remove filler words
      .trim()
  }

  // Detect language from text
  const detectLanguage = (text: string): 'english' | 'hindi' => {
    const hindiPattern = /[\u0900-\u097F]/
    const hindiWords = ['नमस्ते', 'हैलो', 'नोट', 'बनाओ', 'खोजो', 'मदद', 'कैसे', 'क्या', 'हाँ', 'नहीं', 'ठीक', 'धन्यवाद', 'आप', 'मैं', 'हूँ', 'है', 'के', 'की', 'को', 'से', 'में', 'पर', 'और', 'या', 'भी', 'तो', 'यह', 'वह', 'इस', 'उस', 'कर', 'कि', 'जो', 'तक', 'अब', 'यदि', 'फिर', 'वाला', 'वाली', 'वाले']
    
    console.log('🔍 Detecting language for text:', text)
    
    // Check for Devanagari script
    if (hindiPattern.test(text)) {
      console.log('🔍 Hindi detected by script')
      return 'hindi'
    }
    
    // Check for Hindi words
    const lowerText = text.toLowerCase()
    const foundHindiWords = hindiWords.filter(word => lowerText.includes(word))
    if (foundHindiWords.length > 0) {
      console.log('🔍 Hindi detected by words:', foundHindiWords)
      return 'hindi'
    }
    
    // Check for transliterated Hindi patterns
    const transliteratedPatterns = [
      /\b(namaste|namaskar|dhanyawad|theek|kaise|kya|haan|nahi|aap|main|hun|hai)\b/i,
      /\b(note|banao|khojo|madad|help|create|find)\b/i
    ]
    
    for (const pattern of transliteratedPatterns) {
      if (pattern.test(text)) {
        console.log('🔍 Hindi detected by transliteration pattern')
        return 'hindi'
      }
    }
    
    console.log('🔍 English detected (default)')
    return 'english'
  }

  // Find best voice for language
  const findBestVoice = (language: 'english' | 'hindi'): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices()
    console.log(`🎵 Finding voice for ${language}, available voices:`, voices.length)
    
    if (language === 'hindi') {
      // Look for Hindi voices with multiple patterns
      const hindiVoices = voices.filter(voice => 
        voice.lang.includes('hi') || 
        voice.lang.includes('IN') ||
        voice.name.toLowerCase().includes('hindi') ||
        voice.name.toLowerCase().includes('india') ||
        voice.lang === 'hi-IN'
      )
      
      console.log('🎵 Found Hindi voices:', hindiVoices.map(v => `${v.name} (${v.lang})`))
      
      if (hindiVoices.length > 0) {
        // Prefer Google Hindi voice first (best quality)
        const googleHindiVoice = hindiVoices.find(voice => 
          voice.name.toLowerCase().includes('google') && voice.lang === 'hi-IN'
        )
        if (googleHindiVoice) {
          console.log('🎵 Using Google Hindi voice:', googleHindiVoice.name)
          return googleHindiVoice
        }
        
        // Then prefer Lekha (native Hindi voice)
        const lekhaVoice = hindiVoices.find(voice => 
          voice.name.toLowerCase().includes('lekha')
        )
        if (lekhaVoice) {
          console.log('🎵 Using Lekha Hindi voice:', lekhaVoice.name)
          return lekhaVoice
        }
        
        // Then prefer local voices
        const localHindiVoice = hindiVoices.find(voice => voice.localService)
        if (localHindiVoice) {
          console.log('🎵 Using local Hindi voice:', localHindiVoice.name)
          return localHindiVoice
        }
        
        console.log('🎵 Using first Hindi voice:', hindiVoices[0].name)
        return hindiVoices[0]
      }
      
      // Fallback: Use any Indian English voice for Hindi text
      const indianEnglishVoices = voices.filter(voice => 
        voice.lang.includes('IN') && voice.lang.includes('en')
      )
      
      if (indianEnglishVoices.length > 0) {
        console.log('🎵 Using Indian English voice for Hindi:', indianEnglishVoices[0].name)
        return indianEnglishVoices[0]
      }
      
      // Final fallback: Use any voice that might work with Hindi
      const fallbackVoices = voices.filter(voice => 
        voice.lang.includes('en') || voice.name.toLowerCase().includes('google')
      )
      
      if (fallbackVoices.length > 0) {
        console.log('🎵 Using fallback voice for Hindi:', fallbackVoices[0].name)
        return fallbackVoices[0]
      }
      
      console.log('🎵 No suitable voice found for Hindi, using default')
      return voices[0] || null
    } else {
      // Look for natural English voices (prefer female voices as they sound more natural)
      const preferredVoices = [
        'Samantha', 'Victoria', 'Allison', 'Ava', 'Susan', 'Veena', 'Fiona',
        'Google UK English Female', 'Microsoft Zira', 'Alex'
      ]
      
      for (const preferred of preferredVoices) {
        const voice = voices.find(v => v.name.includes(preferred))
        if (voice) {
          console.log('🎵 Using preferred English voice:', voice.name)
          return voice
        }
      }
      
      // Fallback to any English voice
      const englishVoices = voices.filter(voice => 
        voice.lang.includes('en') && 
        (voice.lang.includes('US') || voice.lang.includes('GB'))
      )
      
      if (englishVoices.length > 0) {
        console.log('🎵 Using fallback English voice:', englishVoices[0].name)
        return englishVoices[0]
      }
      
      console.log('🎵 Using default voice (first available)')
      return voices[0] || null
    }
  }

  // Detect user interaction for speech synthesis
  useEffect(() => {
    const handleUserInteraction = () => {
      console.log('👆 User interaction detected')
      setHasUserInteracted(true)
      
      // Test speech synthesis capability
      if ('speechSynthesis' in window && !hasUserInteracted) {
        console.log('🔊 Testing speech synthesis capability...')
        const testUtterance = new SpeechSynthesisUtterance('')
        window.speechSynthesis.speak(testUtterance)
        window.speechSynthesis.cancel()
      }
    }

    // Listen for various user interaction events
    const events = ['click', 'touchstart', 'keydown', 'mousedown']
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction)
      })
    }
  }, [hasUserInteracted])

  // Load voices and ensure they're available
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        console.log('🎵 Voices loading check:', voices.length)
        
        if (voices.length > 0) {
          setVoicesLoaded(true)
          console.log('🎵 All available voices:')
          voices.forEach((voice, index) => {
            console.log(`  ${index}: ${voice.name} (${voice.lang}) - Local: ${voice.localService}`)
          })
        } else {
          console.log('🎵 No voices loaded yet, will retry...')
        }
      }

      // Load voices immediately
      loadVoices()
      
      // Listen for voices changed event
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
      
      // Multiple fallback attempts with increasing delays
      const retryDelays = [500, 1000, 2000, 3000]
      retryDelays.forEach((delay, index) => {
        setTimeout(() => {
          if (!voicesLoaded) {
            console.log(`🎵 Retry ${index + 1}: Force loading voices after ${delay}ms`)
            loadVoices()
          }
        }, delay)
      })

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      }
    }
  }, [voicesLoaded])

  // Enhanced speech function with human-like qualities
  const speak = (text: string, language?: 'english' | 'hindi') => {
    console.log('🔊 Speak function called:', { 
      text: text.substring(0, 50) + '...', 
      language, 
      speechEnabled, 
      hasUserInteracted, 
      isSpeaking
    })

    if (!speechEnabled || !('speechSynthesis' in window) || !text.trim()) {
      console.log('🔊 Speech skipped - basic checks failed')
      return
    }

    if (!hasUserInteracted) {
      console.log('🔊 Speech skipped - no user interaction yet')
      return
    }

    // If already speaking, just return (don't queue or cancel)
    if (isSpeaking) {
      console.log('🔊 Already speaking, skipping this request')
      return
    }

    // Clean text for better speech
    const cleanText = cleanTextForSpeech(text)
    if (!cleanText) {
      console.log('🔊 No clean text to speak')
      return
    }

    const targetLang = language || currentLanguage
    console.log(`🔊 Speaking in ${targetLang}:`, cleanText.substring(0, 50) + '...')
    
    // Set speaking state immediately to prevent conflicts
    setIsSpeaking(true)

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanText)
    currentUtteranceRef.current = utterance
    
    // Use best voice for language
    const bestVoice = findBestVoice(targetLang)
    if (bestVoice) {
      utterance.voice = bestVoice
      console.log('🔊 Using voice:', bestVoice.name, bestVoice.lang)
    } else {
      console.log('🔊 No specific voice found, using default')
    }
    
    // Human-like speech settings
    if (targetLang === 'hindi') {
      utterance.lang = 'hi-IN'
      utterance.rate = 0.8  // Slower for Hindi
      utterance.pitch = 1.0 // Normal pitch
      utterance.volume = 1.0 // Full volume
      console.log('🔊 Hindi speech settings applied')
    } else {
      utterance.lang = 'en-US'
      utterance.rate = 0.95
      utterance.pitch = 1.0
      utterance.volume = 0.9
      console.log('🔊 English speech settings applied')
    }

    utterance.onstart = () => {
      console.log('🔊 Speech started successfully')
      setIsSpeaking(true)
    }
    
    utterance.onend = () => {
      console.log('🔊 Speech ended successfully')
      setIsSpeaking(false)
      currentUtteranceRef.current = null
      
      // Restart wake word listening after speaking
      setTimeout(() => {
        if (!isListening && isOpen) {
          startWakeWordListening()
        }
      }, 500)
    }
    
    utterance.onerror = (event) => {
      console.error('🔊 Speech error:', event.error)
      setIsSpeaking(false)
      currentUtteranceRef.current = null
      
      // Only try fallback for specific errors and Hindi language
      if (targetLang === 'hindi' && (event.error === 'synthesis-failed' || event.error === 'voice-unavailable')) {
        console.log('🔊 Trying Hindi with English voice fallback...')
        setTimeout(() => {
          // Simple fallback - use English voice with Hindi text
          const fallbackUtterance = new SpeechSynthesisUtterance(cleanText)
          fallbackUtterance.lang = 'en-US'
          fallbackUtterance.rate = 0.8
          fallbackUtterance.volume = 1.0
          
          fallbackUtterance.onstart = () => {
            console.log('🔊 Hindi fallback started')
            setIsSpeaking(true)
          }
          
          fallbackUtterance.onend = () => {
            console.log('🔊 Hindi fallback ended')
            setIsSpeaking(false)
            setTimeout(() => {
              if (!isListening && isOpen) {
                startWakeWordListening()
              }
            }, 500)
          }
          
          fallbackUtterance.onerror = () => {
            console.log('🔊 Hindi fallback also failed')
            setIsSpeaking(false)
          }
          
          window.speechSynthesis.speak(fallbackUtterance)
        }, 500)
      } else {
        // For other cases, just restart wake word listening
        setTimeout(() => {
          if (!isListening && isOpen) {
            startWakeWordListening()
          }
        }, 500)
      }
    }

    console.log('🔊 Starting speech synthesis')
    try {
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      console.error('🔊 Error calling speechSynthesis.speak():', error)
      setIsSpeaking(false)
      currentUtteranceRef.current = null
    }
  }

  // Initialize speech recognition for commands
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      
      try {
        recognitionRef.current = new SpeechRecognition()
        
        if (recognitionRef.current) {
          recognitionRef.current.continuous = false
          recognitionRef.current.interimResults = false
          // Always start with Hindi recognition to catch Hindi speech
          recognitionRef.current.lang = 'hi-IN'

          recognitionRef.current.onstart = () => {
            console.log('🎤 Regular recognition started with lang:', recognitionRef.current.lang)
            setIsListening(true)
          }
          
          recognitionRef.current.onend = () => {
            console.log('🎤 Regular recognition ended')
            setIsListening(false)
          }
          
          recognitionRef.current.onresult = (event: any) => {
            try {
              const transcript = event.results[0]?.item(0)?.transcript
              console.log('🎤 Speech recognition result:', transcript)
              
              if (transcript) {
                const detectedLang = detectLanguage(transcript)
                console.log('🎤 Detected language:', detectedLang)
                setCurrentLanguage(detectedLang)
                
                // If we detected English but were listening in Hindi, try again with English
                if (detectedLang === 'english' && recognitionRef.current.lang === 'hi-IN') {
                  console.log('🎤 Switching to English recognition and retrying...')
                  recognitionRef.current.lang = 'en-US'
                  setTimeout(() => {
                    if (!isListening) {
                      startListening()
                    }
                  }, 500)
                  return
                }
                
                handleUserMessage(transcript)
              }
            } catch (error) {
              console.error('🎤 Error processing speech result:', error)
            }
          }

          recognitionRef.current.onerror = (event: any) => {
            console.log('🎤 Speech recognition error:', event.error)
            setIsListening(false)
            
            // Handle specific errors without throwing
            try {
              if (event.error === 'aborted') {
                console.log('🎤 Recognition was aborted, this is normal')
              } else if (event.error === 'not-allowed') {
                console.error('🎤 Microphone permission denied')
              } else if (event.error === 'no-speech') {
                console.log('🎤 No speech detected, trying other language...')
                // Switch language and retry
                const newLang = recognitionRef.current.lang === 'hi-IN' ? 'en-US' : 'hi-IN'
                recognitionRef.current.lang = newLang
                console.log('🎤 Switched to language:', newLang)
                setTimeout(() => {
                  if (!isListening && !isWakeWordListening && isOpen) {
                    startListening()
                  }
                }, 1000)
              } else if (event.error === 'network') {
                console.log('🎤 Network error in speech recognition')
              } else {
                console.log('🎤 Other speech recognition error:', event.error)
                // Restart wake word listening for other errors
                setTimeout(() => {
                  if (!isListening && !isWakeWordListening && isOpen) {
                    startWakeWordListening()
                  }
                }, 1000)
              }
            } catch (errorHandlingError) {
              console.error('🎤 Error in error handling:', errorHandlingError)
            }
          }
        }
      } catch (error) {
        console.error('🎤 Failed to initialize speech recognition:', error)
      }
    } else {
      console.log('🎤 Speech recognition not supported')
    }
  }, [isOpen])

  // Initialize wake word recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      
      try {
        wakeWordRecognitionRef.current = new SpeechRecognition()
        
        if (wakeWordRecognitionRef.current) {
          wakeWordRecognitionRef.current.continuous = true
          wakeWordRecognitionRef.current.interimResults = true
          // Use Hindi recognition for wake word to catch both languages
          wakeWordRecognitionRef.current.lang = 'hi-IN'

          wakeWordRecognitionRef.current.onstart = () => {
            console.log('🔊 Wake word recognition started with lang:', wakeWordRecognitionRef.current.lang)
            setIsStartingWakeWord(false)
            setIsWakeWordListening(true)
          }
          
          wakeWordRecognitionRef.current.onend = () => {
            console.log('🔊 Wake word recognition ended')
            setIsStartingWakeWord(false)
            setIsWakeWordListening(false)
            
            // Schedule restart instead of immediate restart
            scheduleWakeWordRestart(1000)
          }
          
          wakeWordRecognitionRef.current.onresult = (event: any) => {
            try {
              const transcript = event.results[event.results.length - 1]?.item(0)?.transcript?.toLowerCase()
              console.log('🔊 Wake word transcript:', transcript)
              
              if (transcript && (
                transcript.includes('hey brainer') || 
                transcript.includes('hi brainer') ||
                transcript.includes('hello brainer') ||
                transcript.includes('हे ब्रेनर') ||
                transcript.includes('हैलो ब्रेनर') ||
                transcript.includes('नमस्ते ब्रेनर') ||
                (transcript.includes('brainer') && transcript.length < 15) ||
                (transcript.includes('ब्रेनर') && transcript.length < 15)
              )) {
                console.log('🔊 Wake word detected:', transcript)
                handleWakeWordDetected()
              }
            } catch (error) {
              console.error('🔊 Error processing wake word result:', error)
            }
          }

          wakeWordRecognitionRef.current.onerror = (event: any) => {
            console.log('🔊 Wake word recognition error:', event.error)
            setIsStartingWakeWord(false)
            setIsWakeWordListening(false)
            
            // Handle specific errors without throwing
            try {
              if (event.error === 'aborted') {
                console.log('🔊 Wake word recognition was aborted, this is normal')
              } else if (event.error === 'not-allowed') {
                console.error('🔊 Microphone permission denied for wake word')
              } else if (event.error === 'no-speech') {
                console.log('🔊 No speech detected for wake word')
              } else if (event.error === 'network') {
                console.log('🔊 Network error in wake word recognition')
              } else {
                console.log('🔊 Other wake word recognition error:', event.error)
                // Schedule restart for other errors
                scheduleWakeWordRestart(3000)
              }
            } catch (errorHandlingError) {
              console.error('🔊 Error in wake word error handling:', errorHandlingError)
            }
          }
        }
      } catch (error) {
        console.error('🔊 Failed to initialize wake word recognition:', error)
      }
    }
  }, [isOpen, isListening])

  // Start wake word listening when assistant opens
  useEffect(() => {
    if (isOpen && !isWakeWordListening && !isListening && !isStartingWakeWord) {
      // Delay initial start to avoid conflicts
      scheduleWakeWordRestart(500)
    } else if (!isOpen) {
      stopWakeWordListening()
    }
  }, [isOpen])

  // Stop wake word when regular listening starts
  useEffect(() => {
    if (isListening && isWakeWordListening) {
      stopWakeWordListening()
    }
  }, [isListening])

  const startWakeWordListening = () => {
    // Clear any existing timeout
    if (wakeWordTimeoutRef.current) {
      clearTimeout(wakeWordTimeoutRef.current)
      wakeWordTimeoutRef.current = null
    }

    // Prevent multiple simultaneous starts
    if (isStartingWakeWord || isWakeWordListening || isListening) {
      console.log('Wake word start prevented - already active or starting')
      return
    }

    if (!wakeWordRecognitionRef.current) {
      console.log('Wake word recognition not initialized')
      return
    }

    console.log('Starting wake word listening...')
    setIsStartingWakeWord(true)

    try {
      wakeWordRecognitionRef.current.start()
    } catch (error) {
      console.error('Failed to start wake word recognition:', error)
      setIsStartingWakeWord(false)
      setIsWakeWordListening(false)
    }
  }

  const stopWakeWordListening = () => {
    // Clear any pending restart timeout
    if (wakeWordTimeoutRef.current) {
      clearTimeout(wakeWordTimeoutRef.current)
      wakeWordTimeoutRef.current = null
    }

    setIsStartingWakeWord(false)

    if (wakeWordRecognitionRef.current && isWakeWordListening) {
      console.log('Stopping wake word listening...')
      try {
        wakeWordRecognitionRef.current.stop()
      } catch (error) {
        console.error('Failed to stop wake word recognition:', error)
      }
    }
    setIsWakeWordListening(false)
  }

  const scheduleWakeWordRestart = (delay: number = 2000) => {
    // Clear any existing timeout
    if (wakeWordTimeoutRef.current) {
      clearTimeout(wakeWordTimeoutRef.current)
    }

    // Only schedule restart if assistant is open and not doing regular listening
    if (isOpen && !isListening && !isWakeWordListening && !isStartingWakeWord) {
      console.log(`Scheduling wake word restart in ${delay}ms`)
      wakeWordTimeoutRef.current = setTimeout(() => {
        if (isOpen && !isListening && !isWakeWordListening && !isStartingWakeWord) {
          startWakeWordListening()
        }
      }, delay)
    }
  }

  const handleWakeWordDetected = () => {
    stopWakeWordListening()
    
    const responses = [
      { en: "Yes, how can I help you?", hi: "हाँ, मैं आपकी कैसे मदद कर सकता हूँ?" },
      { en: "I'm listening, what do you need?", hi: "मैं सुन रहा हूँ, आपको क्या चाहिए?" },
      { en: "Hi there, what can I do for you?", hi: "नमस्ते, मैं आपके लिए क्या कर सकता हूँ?" }
    ]
    
    const response = responses[Math.floor(Math.random() * responses.length)]
    const responseText = currentLanguage === 'hindi' ? response.hi : response.en
    
    const wakeWordMessage: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      text: responseText,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, wakeWordMessage])
    
    speak(responseText, currentLanguage)
    
    setTimeout(() => {
      if (!isSpeaking) {
        startListening()
      }
    }, 1500)
  }

  // First-time welcome
  useEffect(() => {
    if (isFirstTime && userId) {
      setTimeout(() => {
        setIsOpen(true)
        const welcomeText = "Hello! I'm Brainer, your intelligent note-taking assistant. I can help you create, organize, and find your notes using voice commands. I understand both English and Hindi. How can I assist you today?"
        
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          text: welcomeText,
          timestamp: new Date()
        }
        setMessages([welcomeMessage])
        
        setTimeout(() => speak(welcomeText, 'english'), 1000)
      }, 1000)
    }
  }, [isFirstTime, userId])

  const startListening = () => {
    console.log('🎤 startListening called')
    
    // Record user interaction
    setHasUserInteracted(true)
    
    if (!recognitionRef.current) {
      console.log('🎤 No recognition ref available')
      return
    }

    if (isListening || isStartingWakeWord) {
      console.log('🎤 Already listening or starting wake word')
      return
    }

    console.log('🎤 Stopping wake word and starting regular recognition')
    
    // Stop wake word listening first
    stopWakeWordListening()
    
    // Set recognition language based on current language
    const targetLang = currentLanguage === 'hindi' ? 'hi-IN' : 'en-US'
    recognitionRef.current.lang = targetLang
    console.log('🎤 Setting recognition language to:', targetLang)
    
    // Wait a moment before starting regular recognition
    setTimeout(() => {
      if (recognitionRef.current && !isListening) {
        try {
          console.log('🎤 Starting speech recognition with lang:', recognitionRef.current.lang)
          recognitionRef.current.start()
        } catch (error) {
          console.error('🎤 Failed to start speech recognition:', error)
          setIsListening(false)
          // Schedule wake word restart if regular recognition fails
          scheduleWakeWordRestart(1000)
        }
      }
    }, 200)
  }

  const stopListening = () => {
    console.log('🎤 stopListening called')
    
    if (recognitionRef.current && isListening) {
      try {
        console.log('🎤 Stopping speech recognition')
        recognitionRef.current.stop()
      } catch (error) {
        console.error('🎤 Failed to stop speech recognition:', error)
      }
      setIsListening(false)
    }
    
    // Schedule wake word restart after stopping regular listening
    scheduleWakeWordRestart(1000)
  }

  const handleUserMessage = async (text: string) => {
    // Record user interaction
    setHasUserInteracted(true)
    
    const detectedLang = detectLanguage(text)
    setCurrentLanguage(detectedLang)

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
          language: detectedLang,
          context: 'Brainer is an intelligent note-taking app. Respond naturally and conversationally. Be helpful and specific about note management features.'
        }),
      })

      if (!response.ok) throw new Error('Failed to process query')

      const result = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: result.response || "I'm here to help with your notes!",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Speak response in detected language
      if (speechEnabled && result.response) {
        const responseLang = result.language || detectedLang
        setTimeout(() => speak(result.response, responseLang), 200)
      }

      // Handle note creation
      if (result.action === 'create_note' && result.noteData && onCreateNote) {
        try {
          await onCreateNote(
            result.noteData.title || 'New Note',
            result.noteData.content || '',
            result.noteData.tags || []
          )
          
          const successText = detectedLang === 'hindi' 
            ? `बहुत बढ़िया! मैंने आपका नोट बना दिया है`
            : `Perfect! I've created your note successfully`
          
          const successMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'assistant',
            text: successText,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, successMessage])
          
          if (speechEnabled) {
            setTimeout(() => speak(successText, detectedLang), 400)
          }
        } catch (error) {
          console.error('Failed to create note:', error)
        }
      }

      // Auto-select found notes
      if (result.foundNotes?.length > 0) {
        setTimeout(() => onNoteSelect(result.foundNotes[0]), 800)
      }

    } catch (error) {
      console.error('Error processing voice query:', error)
      const errorText = currentLanguage === 'hindi'
        ? "माफ करें, मुझे समस्या हुई। कृपया फिर से कोशिश करें।"
        : "Sorry, I couldn't process that. Please try again."
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: errorText,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      
      if (speechEnabled) {
        setTimeout(() => speak(errorText, currentLanguage), 200)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Record user interaction
      setHasUserInteracted(true)
      
      const input = e.currentTarget
      const text = input.value.trim()
      if (text) {
        handleUserMessage(text)
        input.value = ''
      }
    }
  }

  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled)
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  // Toggle language function
  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'english' ? 'hindi' : 'english'
    console.log('🌐 Switching language from', currentLanguage, 'to', newLanguage)
    setCurrentLanguage(newLanguage)
    
    // Update recognition language if currently listening
    if (recognitionRef.current) {
      const newLang = newLanguage === 'hindi' ? 'hi-IN' : 'en-US'
      recognitionRef.current.lang = newLang
      console.log('🌐 Updated recognition language to:', newLang)
    }
    
    // Announce language change
    const announcement = newLanguage === 'hindi' 
      ? 'भाषा हिंदी में बदल गई है'
      : 'Language switched to English'
    
    setTimeout(() => speak(announcement, newLanguage), 200)
  }

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (wakeWordTimeoutRef.current) {
        clearTimeout(wakeWordTimeoutRef.current)
      }

      // Cleanup all recognition instances when component unmounts
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.log('Recognition cleanup error:', error)
        }
      }
      
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.stop()
        } catch (error) {
          console.log('Wake word recognition cleanup error:', error)
        }
      }
      
      // Stop any ongoing speech and clear references
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      
      if (currentUtteranceRef.current) {
        currentUtteranceRef.current = null
      }
      
      setIsSpeaking(false)
    }
  }, [])

  // Stop all recognition when assistant closes
  useEffect(() => {
    if (!isOpen) {
      // Clear any pending timeouts
      if (wakeWordTimeoutRef.current) {
        clearTimeout(wakeWordTimeoutRef.current)
        wakeWordTimeoutRef.current = null
      }

      // Stop all recognition when closing
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.log('Stop recognition on close error:', error)
        }
      }
      
      if (wakeWordRecognitionRef.current && (isWakeWordListening || isStartingWakeWord)) {
        try {
          wakeWordRecognitionRef.current.stop()
        } catch (error) {
          console.log('Stop wake word recognition on close error:', error)
        }
      }
      
      // Stop speech when closing
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      
      if (currentUtteranceRef.current) {
        currentUtteranceRef.current = null
      }
      
      setIsListening(false)
      setIsWakeWordListening(false)
      setIsStartingWakeWord(false)
      setIsSpeaking(false)
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
          {isWakeWordListening && (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Listening for 'Hey Brainer'"></div>
          )}
          {/* Language indicator */}
          <button
            onClick={toggleLanguage}
            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
              currentLanguage === 'hindi' 
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            title={`Current: ${currentLanguage === 'hindi' ? 'Hindi' : 'English'} - Click to switch`}
          >
            {currentLanguage === 'hindi' ? 'हिंदी' : 'EN'}
          </button>
          {/* Voice loading indicator */}
          {!voicesLoaded && (
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Loading voices..."></div>
          )}
        </div>
        <div className="flex items-center gap-2">
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
            onClick={toggleLanguage}
            className="p-1 rounded transition-colors text-gray-400 bg-gray-100 hover:text-gray-500"
            title="Switch language"
          >
            🌐
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
            <p>Hi! I'm Brainer, your intelligent assistant</p>
            <p>I can help you with notes in English and Hindi</p>
            <div className="mt-3 space-y-1 text-xs">
              <p>Try saying:</p>
              <p>"Hey Brainer, create a note about my meeting"</p>
              <p>"Find my work notes"</p>
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
        {/* Wake word status */}
        {isWakeWordListening && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-800">Say "Hey Brainer" to start...</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={currentLanguage === 'hindi' ? "अपना संदेश टाइप करें या 'Hey Brainer' कहें..." : "Type your message or say 'Hey Brainer'..."}
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={handleTextInput}
          />
          
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('🎤 Mic button clicked! isListening:', isListening, 'isProcessing:', isProcessing)
              if (isListening) {
                console.log('🎤 Stopping listening...')
                stopListening()
              } else {
                console.log('🎤 Starting listening...')
                startListening()
              }
            }}
            disabled={false}
            className={`p-2 rounded-lg transition-colors cursor-pointer border-2 ${
              isListening
                ? 'bg-red-100 text-red-600 hover:bg-red-200 border-red-300'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200 border-blue-300'
            }`}
            title={isListening ? 'Stop listening' : 'Start listening'}
            style={{ minWidth: '40px', minHeight: '40px', zIndex: 1000 }}
          >
            <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
          </button>

          {isSpeaking && (
            <button
              onClick={() => {
                window.speechSynthesis.cancel()
                setIsSpeaking(false)
              }}
              className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors cursor-pointer"
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