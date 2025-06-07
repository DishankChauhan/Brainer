'use client'

import { useAuth } from '@/components/AuthProvider'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                🧠 Brainer
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user.displayName || user.email}!
              </span>
              <button
                onClick={handleSignOut}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Your Brainer Workspace! 🧠
              </h2>
              <p className="text-gray-600 mb-8">
                Your memory-preserving workspace is ready. Start capturing your ideas!
              </p>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-3xl mb-4">📝</div>
                  <h3 className="font-medium text-gray-900 mb-2">Create Notes</h3>
                  <p className="text-gray-500 text-sm">Write down your thoughts and ideas with rich formatting</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-3xl mb-4">🎙️</div>
                  <h3 className="font-medium text-gray-900 mb-2">Voice Memos</h3>
                  <p className="text-gray-500 text-sm">Upload voice recordings for automatic transcription</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-3xl mb-4">🔍</div>
                  <h3 className="font-medium text-gray-900 mb-2">Smart Search</h3>
                  <p className="text-gray-500 text-sm">Find your ideas instantly with AI-powered search</p>
                </div>
              </div>
              
              <div className="mt-8">
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium">
                  Create Your First Note
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 