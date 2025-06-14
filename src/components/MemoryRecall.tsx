'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNotes } from '@/hooks/useNotes'
import { Brain, Clock, FileText, Search, Sparkles } from 'lucide-react'

interface SimilarNote {
  id: string
  title: string
  content: string
  similarity: number
  createdAt: string
  summary?: string
}

interface MemoryRecallProps {
  currentContent: string
  currentNoteId?: string
  onNoteSelect: (noteId: string) => void
  className?: string
}

export function MemoryRecall({ currentContent, currentNoteId, onNoteSelect, className = '' }: MemoryRecallProps) {
  const { findSimilarNotes } = useNotes()
  const [similarNotes, setSimilarNotes] = useState<SimilarNote[]>([])
  const [loading, setLoading] = useState(false)
  const [showMemoryRecall, setShowMemoryRecall] = useState(false)
  
  // Cache to avoid redundant API calls
  const cacheRef = useRef<Map<string, SimilarNote[]>>(new Map())
  const lastQueryRef = useRef<string>('')

  // Faster debounce with instant feedback for short queries
  useEffect(() => {
    // Instant feedback for very short queries
    if (currentContent.length > 0 && currentContent.length < 5) {
      setSimilarNotes([])
      setShowMemoryRecall(false)
      setLoading(false)
      return
    }

    // Don't search for empty content
    if (!currentContent || currentContent.length < 5) {
      setSimilarNotes([])
      setShowMemoryRecall(false)
      return
    }

    const timer = setTimeout(async () => {
      // Create cache key (first 100 chars + currentNoteId)
      const cacheKey = `${currentContent.substring(0, 100).toLowerCase().trim()}-${currentNoteId || 'none'}`
      
      // Check cache first
      if (cacheRef.current.has(cacheKey)) {
        const cachedResults = cacheRef.current.get(cacheKey)!
        console.log('Memory Recall: Using cached results for:', cacheKey.substring(0, 30))
        setSimilarNotes(cachedResults)
        setShowMemoryRecall(cachedResults.length > 0)
        return
      }

      // Skip if same query as last time (prevent duplicate calls)
      if (currentContent === lastQueryRef.current) {
        return
      }
      lastQueryRef.current = currentContent

      console.log('Memory Recall: Starting search with content:', currentContent.substring(0, 100) + '...')
      console.log('Memory Recall: Content length:', currentContent.length)
      console.log('Memory Recall: Current note ID to exclude:', currentNoteId)

      setLoading(true)
      try {
        const results = await findSimilarNotes(currentContent, 3, currentNoteId)
        console.log('Memory Recall: Search results:', results.length, 'notes found')
        console.log('Memory Recall: Results details:', results.map(r => ({
          id: r.id,
          title: r.title.substring(0, 30),
          similarity: r.similarity
        })))
        
        // Cache the results
        cacheRef.current.set(cacheKey, results)
        
        // Limit cache size to prevent memory issues
        if (cacheRef.current.size > 50) {
          const firstKey = cacheRef.current.keys().next().value
          if (firstKey) {
            cacheRef.current.delete(firstKey)
          }
        }
        
        setSimilarNotes(results)
        setShowMemoryRecall(results.length > 0)
      } catch (error) {
        console.error('Memory Recall: Error finding similar notes:', error)
        setSimilarNotes([])
        setShowMemoryRecall(false)
      } finally {
        setLoading(false)
      }
    }, 600) // Reduced from 800ms to 600ms for faster response

    return () => clearTimeout(timer)
  }, [currentContent, currentNoteId, findSimilarNotes])

  // Clear cache when currentNoteId changes
  useEffect(() => {
    cacheRef.current.clear()
    lastQueryRef.current = ''
  }, [currentNoteId])

  const getTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`
    return `${Math.ceil(diffDays / 365)} years ago`
  }, [])

  const getSimilarityColor = useCallback((similarity: number) => {
    if (similarity >= 0.9) return 'text-green-600'
    if (similarity >= 0.8) return 'text-blue-600'
    if (similarity >= 0.7) return 'text-yellow-600'
    return 'text-gray-600'
  }, [])

  const getSimilarityLabel = useCallback((similarity: number) => {
    if (similarity >= 0.9) return 'Highly similar'
    if (similarity >= 0.8) return 'Very similar'
    if (similarity >= 0.7) return 'Similar'
    return 'Somewhat similar'
  }, [])

  if (!showMemoryRecall && !loading) {
    return (
      <div className={`${className} text-center py-8 text-gray-500`}>
        <Brain className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">
          Keep typing to discover related notes...
        </p>
        <p className="text-xs mt-1 opacity-75">
          Memory Recall activates with 5+ characters
        </p>
      </div>
    )
  }

  return (
    <div className={`${className} space-y-4`}>
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-800">Memory Recall</h3>
        {loading && (
          <>
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin ml-auto"></div>
            <span className="text-xs text-purple-600 font-medium">Searching...</span>
          </>
        )}
      </div>

      {/* Loading State */}
      {loading && similarNotes.length === 0 && (
        <div className="text-center py-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Search className="w-5 h-5 text-purple-500 animate-pulse" />
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
          <p className="text-sm text-purple-700 font-medium">Searching your memory...</p>
          <p className="text-xs text-purple-600 mt-1">This usually takes less than a second</p>
        </div>
      )}

      {/* Similar Notes */}
      {similarNotes.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            <Sparkles className="w-4 h-4 inline mr-1" />
            You mentioned similar content before:
          </p>
          
          {similarNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => onNoteSelect(note.id)}
              className="group p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 hover:border-purple-300"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-800 text-sm group-hover:text-purple-800 transition-colors line-clamp-1">
                  {note.title}
                </h4>
                <div className="flex items-center gap-1 text-xs text-gray-500 ml-2 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {getTimeAgo(note.createdAt)}
                </div>
              </div>

              {/* Content Preview */}
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {note.summary || note.content}
              </p>

              {/* Similarity Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {Math.round(note.similarity * 100)}% match
                  </span>
                </div>
                <span className={`text-xs font-medium ${getSimilarityColor(note.similarity)}`}>
                  {getSimilarityLabel(note.similarity)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && similarNotes.length === 0 && currentContent.length >= 5 && (
        <div className="text-center py-6 text-gray-500">
          <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No similar notes found</p>
          <p className="text-xs mt-1 opacity-75">
            This might be a new topic for you!
          </p>
          <p className="text-xs mt-2 text-purple-600">
            Searched: "{currentContent.substring(0, 50)}{currentContent.length > 50 ? '...' : ''}"
          </p>
        </div>
      )}
    </div>
  )
} 