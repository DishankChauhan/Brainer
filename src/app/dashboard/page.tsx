'use client'

import { useAuth } from '@/components/AuthProvider'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, Plus, Tag, FileText, Calendar, Edit3, Trash2, Save, X } from 'lucide-react'
import { useNotes } from '@/hooks/useNotes'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  tags: { id: string; name: string; color: string }[]
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
    error,
    createNote,
    updateNote,
    deleteNote
  } = useNotes()
  
  // State management
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  
  // Form state for note editing
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteTags, setNoteTags] = useState<string[]>([])

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600">Error: {error}</div>
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
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
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
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={handleCreateNote}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </div>

          {/* Tags Filter */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </h3>
            <div className="space-y-2">
              {tags.map(tag => (
                <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
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
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes ({filteredNotes.length})
              </h3>
              <div className="space-y-2">
                {filteredNotes.map(note => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                      selectedNote?.id === note.id
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 truncate">{note.title}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {note.content.replace(/[#*`]/g, '').substring(0, 100)}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
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
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {selectedNote || isCreatingNote ? (
            <>
              {/* Note Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Start writing your note... (Markdown supported)"
                        className="w-full h-96 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
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
            </>
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