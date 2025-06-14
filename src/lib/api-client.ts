import { auth } from './firebase'

// Get current auth token
export async function getAuthToken(): Promise<string | null> {
  const currentUser = auth.currentUser
  if (!currentUser) return null
  
  try {
    const token = await currentUser.getIdToken()
    return token
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
}

// Authenticated fetch wrapper
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken()
  
  if (!token) {
    throw new Error('Authentication required: No valid token found')
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  }

  return fetch(url, {
    ...options,
    headers
  })
}

// API client with built-in authentication
export const apiClient = {
  get: (url: string, options?: RequestInit) => 
    authenticatedFetch(url, { method: 'GET', ...options }),
  
  post: (url: string, data?: any, options?: RequestInit) => 
    authenticatedFetch(url, { 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined,
      ...options 
    }),
  
  put: (url: string, data?: any, options?: RequestInit) => 
    authenticatedFetch(url, { 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined,
      ...options 
    }),
  
  delete: (url: string, options?: RequestInit) => 
    authenticatedFetch(url, { method: 'DELETE', ...options })
} 