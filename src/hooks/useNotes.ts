import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  tags: { id: string; name: string; color: string }[]
  isProcessing?: boolean
  transcriptionJobId?: string
  transcriptionStatus?: string
  transcriptionConfidence?: number
  // AI Summary fields
  summary?: string
  summaryGeneratedAt?: string
  summaryTokensUsed?: number
  keyPoints?: string[]
  hasSummary?: boolean
  // Vector Embeddings for Semantic Search
  hasEmbedding?: boolean
  embeddingGeneratedAt?: string
  embeddingModel?: string
  // Topic Threading & Concept Extraction
  extractedTopics?: {
    topics: string[]
    concepts: string[]
    suggestedTags: string[]
  }
  topicsGeneratedAt?: string
  topicsTokensUsed?: number
  hasTopics?: boolean
}

interface Tag {
  id: string
  name: string
  color: string
}

interface SimilarNote {
  id: string
  title: string
  content: string
  similarity: number
  createdAt: string
  summary?: string
}

export function useNotes() {
  const { user, getAuthToken } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  console.log('useNotes: Hook called, user:', user?.email || 'none')

  // Helper function to make authenticated API calls
  const makeAuthenticatedRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken()
    if (!token) {
      throw new Error('Authentication token not available')
    }

    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    })
  }, [getAuthToken])

  // Sync Firebase user with local database
  const syncUser = async () => {
    if (!user) return false

    // Validate required user data
    if (!user.uid || !user.email) {
      console.error('useNotes: Missing required user data', { uid: user.uid, email: user.email })
      setError('Invalid user data - missing UID or email')
      return false
    }

    console.log('useNotes: Syncing user:', user.email)

    try {
      const syncData = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || null
      }
      
      console.log('useNotes: Sending sync data:', syncData)

      const response = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncData)
      })
      
      if (!response.ok) {
        let errorMessage = 'Failed to sync user'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.details || errorMessage
          console.error('useNotes: Sync API error response:', errorData)
          
          // If user already exists error, treat it as success
          if (errorData.details?.includes('Unique constraint failed') || 
              errorData.details?.includes('already exists')) {
            console.log('useNotes: User already exists, treating as success')
            return true
          }
        } catch (parseError) {
          console.error('useNotes: Failed to parse error response')
        }
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      console.log('useNotes: User synced successfully:', result.id)
      return true
    } catch (err) {
      console.error('Error syncing user:', err)
      
      // Don't treat sync errors as critical if user authentication works
      if (err instanceof Error && 
          (err.message.includes('already exists') || 
           err.message.includes('Unique constraint'))) {
        console.log('useNotes: Ignoring user sync error (user likely exists)')
        return true
      }
      
      setError(err instanceof Error ? err.message : 'Failed to sync user')
      return false
    }
  }

  // Fetch notes
  const fetchNotes = async () => {
    if (!user?.uid) return
    
    try {
      const response = await makeAuthenticatedRequest('/api/notes')
      if (!response.ok) throw new Error('Failed to fetch notes')
      const data = await response.json()
      setNotes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes')
    }
  }

  // Fetch tags
  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (!response.ok) throw new Error('Failed to fetch tags')
      const data = await response.json()
      setTags(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags')
    }
  }

  // Create note
  const createNote = async (title: string, content: string, tagIds: string[] = []) => {
    if (!user?.uid) return null

    try {
      const response = await makeAuthenticatedRequest('/api/notes', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          tagIds
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create note')
      }
      const newNote = await response.json()
      setNotes(prev => [newNote, ...prev])
      return newNote
    } catch (err) {
      console.error('Error creating note:', err)
      setError(err instanceof Error ? err.message : 'Failed to create note')
      return null
    }
  }

  // Update note
  const updateNote = async (id: string, title: string, content: string, tagIds: string[] = []) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          content,
          tagIds
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update note')
      }
      const updatedNote = await response.json()
      setNotes(prev => prev.map(note => note.id === id ? updatedNote : note))
      return updatedNote
    } catch (err) {
      console.error('Error updating note:', err)
      setError(err instanceof Error ? err.message : 'Failed to update note')
      return null
    }
  }

  // Delete note
  const deleteNote = async (id: string) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/notes/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete note')
      }
      setNotes(prev => prev.filter(note => note.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting note:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete note')
      return false
    }
  }

  // Create tag
  const createTag = async (name: string, color: string = '#3B82F6') => {
    try {
      const response = await makeAuthenticatedRequest('/api/tags', {
        method: 'POST',
        body: JSON.stringify({ name, color })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create tag')
      }
      const newTag = await response.json()
      setTags(prev => [...prev, newTag])
      return newTag
    } catch (err) {
      console.error('Error creating tag:', err)
      setError(err instanceof Error ? err.message : 'Failed to create tag')
      return null
    }
  }

  // Generate AI summary for a note
  const generateSummary = async (noteId: string, forceRegenerate: boolean = false) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/notes/${noteId}/summarize`, {
        method: 'POST',
        body: JSON.stringify({ forceRegenerate })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate summary')
      }
      
      const result = await response.json()
      const updatedNote = result.note
      
      // Update the note in our local state
      setNotes(prev => prev.map(note => 
        note.id === noteId ? updatedNote : note
      ))
      
      return updatedNote
    } catch (err) {
      console.error('Error generating summary:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
      return null
    }
  }

  // Generate embedding for a note
  const generateEmbedding = async (noteId: string, forceRegenerate: boolean = false) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/notes/${noteId}/embedding`, {
        method: 'POST',
        body: JSON.stringify({ forceRegenerate })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate embedding')
      }
      
      const result = await response.json()
      
      // Update the note in our local state to reflect embedding status
      setNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, hasEmbedding: true, embeddingGeneratedAt: new Date().toISOString() } : note
      ))
      
      return result
    } catch (err) {
      console.error('Error generating embedding:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate embedding')
      return null
    }
  }

  // Find similar notes using semantic search
  const findSimilarNotes = useCallback(async (query: string, limit: number = 5, excludeNoteId?: string): Promise<SimilarNote[]> => {
    if (!user?.uid) {
      console.log('findSimilarNotes: No user UID found')
      return []
    }
    
    console.log('findSimilarNotes: Input parameters:', { 
      query: query.substring(0, 50), 
      queryLength: query.length,
      limit, 
      excludeNoteId,
      userId: user.uid 
    })
    
    try {
      // Only include noteId if it's provided
      const requestBody: { query: string; limit: number; noteId?: string } = {
        query,
        limit
      }
      
      if (excludeNoteId) {
        requestBody.noteId = excludeNoteId
      }
      
      console.log('findSimilarNotes: Request body being sent:', requestBody)
      
      const response = await makeAuthenticatedRequest('/api/search/similar', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })
      
      console.log('findSimilarNotes: API response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('findSimilarNotes: API error:', errorData)
        throw new Error(errorData.error || 'Failed to find similar notes')
      }
      
      const result = await response.json()
      console.log('findSimilarNotes: API result:', result)
      return result.results || []
    } catch (err) {
      console.error('Error finding similar notes:', err)
      setError(err instanceof Error ? err.message : 'Failed to find similar notes')
      return []
    }
  }, [user?.uid, makeAuthenticatedRequest])

  // Extract topics and concepts from a note
  const extractTopics = async (noteId: string, forceRegenerate: boolean = false) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/notes/${noteId}/topics`, {
        method: 'POST',
        body: JSON.stringify({ forceRegenerate })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to extract topics')
      }
      
      const result = await response.json()
      
      // Update the note in our local state
      setNotes(prev => prev.map(note => 
        note.id === noteId ? { 
          ...note, 
          extractedTopics: result.topics, 
          hasTopics: true,
          topicsGeneratedAt: new Date().toISOString()
        } : note
      ))
      
      return result
    } catch (err) {
      console.error('Error extracting topics:', err)
      setError(err instanceof Error ? err.message : 'Failed to extract topics')
      return null
    }
  }

  // Memory recall: find notes that mention similar content to current typing
  const getMemoryRecall = async (currentContent: string): Promise<SimilarNote[]> => {
    if (!currentContent || currentContent.length < 20) return []
    
    // Use semantic search to find related notes
    return findSimilarNotes(currentContent, 3)
  }

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      
      if (user) {
        console.log('useNotes: Starting loadData for user:', user.email, 'UID:', user.uid)
        console.log('useNotes: User object:', { uid: user.uid, email: user.email, displayName: user.displayName })
        
        // First sync the user, then load data
        const userSynced = await syncUser()
        console.log('useNotes: User sync result:', userSynced)
        
        if (userSynced) {
          console.log('useNotes: Loading notes and tags...')
          await Promise.all([fetchNotes(), fetchTags()])
          console.log('useNotes: Data loading completed')
        } else {
          console.error('useNotes: User sync failed, skipping data loading')
        }
      } else {
        console.log('useNotes: No user found, skipping loadData')
      }
      
      setLoading(false)
    }

    loadData()
  }, [user])

  return {
    notes,
    tags,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    createTag,
    generateSummary,
    generateEmbedding,
    findSimilarNotes,
    extractTopics,
    getMemoryRecall,
    refetch: async () => {
      if (user) {
        await syncUser()
        return Promise.all([fetchNotes(), fetchTags()])
      }
    }
  }
} 