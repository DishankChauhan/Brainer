'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  getAuthToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  getAuthToken: async () => null
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const syncedUsersRef = useRef<Set<string>>(new Set())

  const getAuthToken = async (): Promise<string | null> => {
    if (!user) {
      console.warn('No authenticated user found')
      return null
    }

    try {
      const token = await user.getIdToken()
      return token
    } catch (error) {
      console.error('Failed to get auth token:', error)
      return null
    }
  }

  const syncUser = async (firebaseUser: User) => {
    // Prevent duplicate syncs for the same user
    if (syncedUsersRef.current.has(firebaseUser.uid)) {
      console.log('User already synced, skipping:', firebaseUser.uid)
      return
    }

    try {
      console.log('AuthProvider: Syncing user automatically:', firebaseUser.uid)
      
      const response = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        })
      })

      if (response.ok) {
        syncedUsersRef.current.add(firebaseUser.uid)
        console.log('AuthProvider: User synced successfully')
      } else {
        console.error('AuthProvider: Failed to sync user:', response.status)
      }
    } catch (error) {
      console.error('AuthProvider: Error syncing user:', error)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      
      // Automatically sync user with database when they sign in
      if (firebaseUser) {
        await syncUser(firebaseUser)
      } else {
        // Clear synced users when signing out
        syncedUsersRef.current.clear()
      }
    })

    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, getAuthToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 