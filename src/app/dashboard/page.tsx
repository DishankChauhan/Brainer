'use client'

import { useAuth } from '@/components/AuthProvider'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, Plus, Tag, FileText, Calendar, Edit3, Trash2, Save, X, Brain, Sparkles, Clock, Hash } from 'lucide-react'
import { useNotes } from '@/hooks/useNotes'
import { useFileUpload } from '@/hooks/useFileUpload'
import { FileUpload } from '@/components/FileUpload'
import { MemoryRecall } from '@/components/MemoryRecall'

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
  hasEmbedding?: boolean
  embeddingGeneratedAt?: string
}

interface Tag {
  id: string
  name: string
  color: string
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { 
    notes, 
    tags, 
    loading: notesLoading,
    error: notesError,
    createNote,
    updateNote,
    deleteNote,
    generateSummary,
    refetch
  } = useNotes()
  
  const { uploadFile } = useFileUpload()
  
  // State management
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  
  // Form state for note editing
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteTags, setNoteTags] = useState<string[]>([])

  // Track active polling intervals to prevent duplicates
  const [activePollingJobs, setActivePollingJobs] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin')
    }
  }, [user, authLoading, router])

  // Set the first note as selected when notes load
  useEffect(() => {
    if (notes.length > 0 && !selectedNote) {
      setSelectedNote(notes[0])
    }
  }, [notes, selectedNote])

  // Refresh selected note if it has transcription data to ensure latest content
  useEffect(() => {
    const refreshSelectedNoteIfNeeded = async () => {
      if (selectedNote?.transcriptionJobId && selectedNote?.transcriptionStatus === 'COMPLETED') {
        try {
          const response = await fetch(`/api/transcription/${selectedNote.transcriptionJobId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.note && data.note.id === selectedNote.id) {
              console.log('Refreshing selected note with latest transcription data')
              setSelectedNote(data.note)
            }
          }
        } catch (error) {
          console.error('Failed to refresh selected note:', error)
        }
      }
    }
    
    refreshSelectedNoteIfNeeded()
  }, [selectedNote?.id, selectedNote?.transcriptionJobId])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleCreateNote = () => {
    console.log('Frontend: Creating new note')
    setIsCreatingNote(true)
    setIsEditing(true)
    setSelectedNote(null)
    setNoteTitle('')
    setNoteContent('')
    setNoteTags([])
  }

  const handleSaveNote = async () => {
    console.log('Frontend: Saving note', { isCreatingNote, noteTitle, noteContent, noteTags })
    
    if (isCreatingNote) {
      // Create new note
      const newNote = await createNote(
        noteTitle || 'Untitled Note',
        noteContent,
        noteTags
      )
      if (newNote) {
        setSelectedNote(newNote)
        setIsCreatingNote(false)
      }
    } else if (selectedNote) {
      // Update existing note
      const updatedNote = await updateNote(
        selectedNote.id,
        noteTitle,
        noteContent,
        noteTags
      )
      if (updatedNote) {
        setSelectedNote(updatedNote)
      }
    }
    setIsEditing(false)
  }

  const handleEditNote = (note: Note) => {
    setSelectedNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setNoteTags(note.tags.map(tag => tag.id))
    setIsEditing(true)
    setIsCreatingNote(false)
  }

  const handleDeleteNote = async (noteId: string) => {
    const success = await deleteNote(noteId)
    if (success) {
      if (selectedNote?.id === noteId) {
        const remainingNotes = notes.filter(note => note.id !== noteId)
        setSelectedNote(remainingNotes.length > 0 ? remainingNotes[0] : null)
      }
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setIsCreatingNote(false)
    if (selectedNote) {
      setNoteTitle(selectedNote.title)
      setNoteContent(selectedNote.content)
      setNoteTags(selectedNote.tags.map(tag => tag.id))
    }
  }

  // Filter notes based on search and tags
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchQuery === '' || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tagId => note.tags.some(tag => tag.id === tagId))
    
    return matchesSearch && matchesTags
  })

  // Handle file uploads
  const handleFileUpload = async (file: File, type: 'voice' | 'screenshot') => {
    try {
      console.log('Dashboard: Handling file upload', { fileName: file.name, type })
      const newNote = await uploadFile(file, type)
      
      console.log('Dashboard: Upload completed, received note:', {
        id: newNote.id,
        isProcessing: newNote.isProcessing,
        transcriptionJobId: newNote.transcriptionJobId,
        transcriptionStatus: newNote.transcriptionStatus,
        hasJobId: !!newNote.transcriptionJobId,
        noteType: type
      })
      
      // Refresh notes to show the new upload
      await refetch?.()
      
      // Select the newly created note
      setSelectedNote(newNote)
      
      // If it's a voice note with transcription job, start polling for updates
      if (type === 'voice') {
        console.log('Dashboard: Voice note uploaded, checking transcription conditions:', {
          isProcessing: newNote.isProcessing,
          hasJobId: !!newNote.transcriptionJobId,
          jobId: newNote.transcriptionJobId
        })
        
        if (newNote.isProcessing && newNote.transcriptionJobId) {
          console.log('✅ Dashboard: Starting transcription polling for job:', newNote.transcriptionJobId)
          startTranscriptionPolling(newNote.transcriptionJobId, newNote.id)
        } else {
          console.log('⚠️ Dashboard: Transcription polling NOT started - conditions not met:', {
            isProcessing: newNote.isProcessing,
            hasJobId: !!newNote.transcriptionJobId,
            reason: !newNote.isProcessing ? 'not processing' : !newNote.transcriptionJobId ? 'no job ID' : 'unknown'
          })
        }
      }
      
      console.log('Dashboard: File uploaded and note created successfully')
    } catch (error) {
      console.error('Dashboard: File upload failed:', error)
      // The FileUpload component will handle displaying the error
    }
  }

  // Poll for transcription updates
  const startTranscriptionPolling = (jobId: string, noteId: string) => {
    // Prevent duplicate polling for the same job
    if (activePollingJobs.has(jobId)) {
      console.log('🚫 Polling already active for job:', jobId)
      return
    }
    
    console.log('🔄 Starting transcription polling for job:', jobId, 'note:', noteId)
    
    // Add to active jobs
    setActivePollingJobs(prev => new Set(prev).add(jobId))
    
    const pollInterval = setInterval(async () => {
      try {
        console.log('🔍 Polling transcription status for job:', jobId)
        
        const response = await fetch(`/api/transcription/${jobId}`)
        console.log('📡 Transcription API response:', {
          url: `/api/transcription/${jobId}`,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })
        
        if (!response.ok) {
          console.error('❌ Failed to check transcription status:', response.status, response.statusText)
          try {
            const errorData = await response.json()
            console.error('❌ Error details:', errorData)
          } catch (e) {
            console.error('❌ Could not parse error response')
          }
          return
        }
        
        const data = await response.json()
        console.log('📊 Transcription polling result:', {
          jobId,
          status: data.status,
          jobComplete: data.jobComplete,
          isProcessing: data.note?.isProcessing,
          hasTranscript: !!data.note?.content?.includes('📝 Transcription'),
          hasIssues: !!data.note?.content?.includes('⚠️ Completed with Issues'),
          contentPreview: data.note?.content?.substring(0, 100) + '...',
          noteId: data.note?.id
        })
        
        // Stop polling if job is complete OR if note already has successful transcript
        const hasSuccessfulTranscript = data.note?.content?.includes('📝 Transcription') && 
                                       !data.note?.content?.includes('⚠️ Completed with Issues')
        
        if (data.jobComplete || hasSuccessfulTranscript) {
          clearInterval(pollInterval)
          console.log('✅ Transcription job completed, stopping polling and refreshing')
          
          // Remove from active jobs
          setActivePollingJobs(prev => {
            const newSet = new Set(prev)
            newSet.delete(jobId)
            return newSet
          })
          
          // Refresh the notes list to get updated data
          await refetch?.()
          
          // Update selected note if it's the one being transcribed
          if (selectedNote?.id === noteId) {
            console.log('🔄 Updating selected note with transcription result')
            setSelectedNote(data.note)
          }
          
          // Show a notification
          if (hasSuccessfulTranscript) {
            console.log('🎉 Voice transcription completed successfully!')
          } else {
            console.log('🎉 Voice transcription completed!')
          }
        }
      } catch (error) {
        console.error('❌ Transcription polling error:', error)
        // Don't clear interval on error, just log and continue
      }
    }, 3000) // Poll every 3 seconds for faster updates

    // Clear interval after 15 minutes (generous timeout)
    setTimeout(() => {
      clearInterval(pollInterval)
      setActivePollingJobs(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })
      console.log('⏰ Transcription polling timeout reached - stopping polling for job:', jobId)
    }, 900000)
    
    // Return the interval ID so it can be cleared if needed
    return pollInterval
  }

  // Also check for processing notes on component mount and start polling
  useEffect(() => {
    if (notes.length > 0) {
      const processingNotes = notes.filter(note => note.isProcessing && note.transcriptionJobId)
      console.log('Found processing notes on mount:', processingNotes.length)
      
      processingNotes.forEach(note => {
        if (note.transcriptionJobId && !activePollingJobs.has(note.transcriptionJobId)) {
          console.log('Restarting polling for existing job:', note.transcriptionJobId)
          startTranscriptionPolling(note.transcriptionJobId, note.id)
        } else if (note.transcriptionJobId) {
          console.log('Polling already active for job:', note.transcriptionJobId)
        }
      })
    }
  }, [notes, activePollingJobs])

  const handleManualRefresh = async (jobId: string, noteId: string) => {
    console.log('Manual refresh triggered for job:', jobId, 'note:', noteId)
    
    try {
      const response = await fetch(`/api/transcription/${jobId}`)
      if (!response.ok) {
        console.error('Failed to refresh transcription status:', response.status, response.statusText)
        return
      }
      
      const data = await response.json()
      console.log('Manual refresh result:', {
        status: data.status,
        jobComplete: data.jobComplete,
        isProcessing: data.note?.isProcessing,
        hasTranscript: !!data.note?.content?.includes('📝 Transcription')
      })
      
      // Always refresh the notes list and update the selected note
      await refetch?.()
      
      if (selectedNote?.id === noteId) {
        console.log('Updating selected note with latest data')
        setSelectedNote(data.note)
      }
      
      if (data.jobComplete) {
        console.log('🎉 Voice transcription completed!')
      }
    } catch (error) {
      console.error('Manual refresh error:', error)
    }
  }

  const handleGenerateSummary = async (noteId: string, forceRegenerate: boolean = false) => {
    setIsGeneratingSummary(true)
    try {
      const updatedNote = await generateSummary(noteId, forceRegenerate)
      if (updatedNote) {
        setSelectedNote(updatedNote)
      }
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  if (authLoading || notesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (notesError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600">Error: {notesError}</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="px-6">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                🧠 Brainer
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 text-sm">
                {user.displayName || user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col max-h-screen">
          {/* Search */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Create Note Button */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <button
              onClick={handleCreateNote}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto">
            {/* File Upload */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                📎 Quick Capture
              </h3>
              <FileUpload onFileUpload={handleFileUpload} />
            </div>

            {/* Tags Filter */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tags.map(tag => (
                  <label key={tag.id} className="flex items-center gap-2 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag.id])
                        } else {
                          setSelectedTags(selectedTags.filter(id => id !== tag.id))
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes List */}
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2 sticky top-0 bg-white py-2 -mt-2">
                <FileText className="w-4 h-4" />
                Notes ({filteredNotes.length})
              </h3>
              <div className="space-y-2">
                {filteredNotes.map(note => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`p-3 rounded-lg cursor-pointer border transition-colors relative ${
                      selectedNote?.id === note.id
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {note.isProcessing && (
                      <div className="absolute top-2 right-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-blue-600 font-medium">Processing</span>
                        </div>
                      </div>
                    )}
                    
                    <h4 className="font-medium text-gray-900 truncate pr-20 flex items-center gap-2">
                      {note.title}
                      {note.hasSummary && (
                        <Brain className="w-3 h-3 text-purple-500 flex-shrink-0" />
                      )}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {note.content.replace(/[#*`]/g, '').substring(0, 100)}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1 flex-wrap">
                        {note.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {note.tags.length > 2 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-300 text-gray-700">
                            +{note.tags.length - 2}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                        <Calendar className="w-3 h-3" />
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {filteredNotes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notes found</p>
                    <p className="text-xs mt-1">
                      {searchQuery || selectedTags.length > 0 
                        ? 'Try adjusting your search or filters' 
                        : 'Create your first note or upload a file'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedNote || isCreatingNote ? (
            <div className="flex-1 flex min-h-0">
              {/* Note Content Column */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Note Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        placeholder="Note title..."
                        className="text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                      />
                    ) : (
                      <h1 className="text-xl font-semibold text-gray-900">
                        {selectedNote?.title}
                      </h1>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveNote}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {selectedNote?.isProcessing && selectedNote?.transcriptionJobId && (
                          <button
                            onClick={() => handleManualRefresh(selectedNote.transcriptionJobId!, selectedNote.id)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                          >
                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            Check Status
                          </button>
                        )}
                        {selectedNote?.transcriptionJobId && 
                         selectedNote?.transcriptionStatus === 'COMPLETED' && 
                         selectedNote?.content?.includes('⚠️ Completed with Issues') &&
                         !selectedNote?.content?.includes('📝 Transcription') && (
                          <button
                            onClick={() => handleManualRefresh(selectedNote.transcriptionJobId!, selectedNote.id)}
                            className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                          >
                            <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                            Retry Transcription
                          </button>
                        )}
                        {!selectedNote?.hasSummary ? (
                          <button
                            onClick={() => handleGenerateSummary(selectedNote!.id)}
                            disabled={isGeneratingSummary || !selectedNote?.content || selectedNote.content.length < 50}
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                          >
                            {isGeneratingSummary ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Brain className="w-4 h-4" />
                            )}
                            {isGeneratingSummary ? 'Generating...' : 'AI Summary'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGenerateSummary(selectedNote!.id, true)}
                            disabled={isGeneratingSummary}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                          >
                            {isGeneratingSummary ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            {isGeneratingSummary ? 'Regenerating...' : 'Regenerate Summary'}
                          </button>
                        )}
                        <button
                          onClick={() => handleEditNote(selectedNote!)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNote(selectedNote!.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Note Content */}
                <div className="flex-1 overflow-y-auto bg-white">
                  <div className="p-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <textarea
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Start writing your note... (Markdown supported)"
                          className="w-full h-96 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm resize-none"
                        />
                        
                        {/* Tags Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                          <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                              <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={noteTags.includes(tag.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNoteTags([...noteTags, tag.id])
                                    } else {
                                      setNoteTags(noteTags.filter(id => id !== tag.id))
                                    }
                                  }}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span
                                  className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="prose max-w-none">
                        {/* AI Summary Display */}
                        {selectedNote!.hasSummary && selectedNote!.summary && (
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <Brain className="w-5 h-5 text-purple-600 mt-0.5" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                  AI Summary
                                  {selectedNote!.summaryGeneratedAt && (
                                    <span className="flex items-center gap-1 text-xs text-purple-600 font-normal">
                                      <Clock className="w-3 h-3" />
                                      {new Date(selectedNote!.summaryGeneratedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </h3>
                                <p className="text-sm text-purple-800 leading-relaxed mb-3">
                                  {selectedNote!.summary}
                                </p>
                                
                                {selectedNote!.keyPoints && selectedNote!.keyPoints.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-purple-900 mb-2 flex items-center gap-1">
                                      <Hash className="w-3 h-3" />
                                      Key Points
                                    </h4>
                                    <ul className="space-y-1">
                                      {selectedNote!.keyPoints.map((point, index) => (
                                        <li key={index} className="text-xs text-purple-700 flex items-start gap-2">
                                          <span className="w-1 h-1 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                          {point}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {selectedNote!.summaryTokensUsed && (
                                  <div className="mt-3 pt-2 border-t border-purple-200">
                                    <span className="text-xs text-purple-600">
                                      {selectedNote!.summaryTokensUsed} tokens used
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Simple markdown rendering */}
                        <div 
                          className="whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ 
                            __html: selectedNote!.content
                              .replace(/# (.*)/g, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
                              .replace(/## (.*)/g, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                              .replace(/- \[ \] (.*)/g, '<div class="flex items-center gap-2"><input type="checkbox" disabled class="rounded"> $1</div>')
                              .replace(/- \[x\] (.*)/g, '<div class="flex items-center gap-2"><input type="checkbox" checked disabled class="rounded"> $1</div>')
                              .replace(/- (.*)/g, '<li class="ml-4">$1</li>')
                          }}
                        />
                        
                        {/* Tags Display */}
                        {selectedNote!.tags.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex gap-2">
                              {selectedNote!.tags.map(tag => (
                                <span
                                  key={tag.id}
                                  className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Memory Recall Sidebar - Only show when editing */}
              {isEditing && (
                <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0 flex flex-col min-h-0">
                  <div className="p-4 flex-1 overflow-y-auto">
                    <MemoryRecall
                      currentContent={noteContent}
                      currentNoteId={selectedNote?.id}
                      onNoteSelect={(noteId) => {
                        const note = notes.find(n => n.id === noteId)
                        if (note) {
                          setSelectedNote(note)
                          setIsEditing(false)
                          setIsCreatingNote(false)
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No note selected</h3>
                <p className="text-gray-600">Choose a note from the sidebar or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 