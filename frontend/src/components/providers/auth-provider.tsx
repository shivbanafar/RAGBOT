"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components/ui/loading'
import Cookies from 'js-cookie'

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check for existing token on mount (only after hydration)
  useEffect(() => {
    if (!mounted) return

    const storedToken = Cookies.get('auth_token')
    const storedUser = Cookies.get('user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    
    setLoading(false)
  }, [mounted])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Login failed')
      }

      const data = await response.json()
      
      setToken(data.token)
      setUser(data.user)
      
      // Store in cookies instead of localStorage
      Cookies.set('auth_token', data.token, { expires: 7 }) // 7 days expiry
      Cookies.set('user', JSON.stringify(data.user), { expires: 7 })
      
      router.push('/chat')
    } catch (error) {
      throw error
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Registration failed')
      }

      const data = await response.json()
      
      setToken(data.token)
      setUser(data.user)
      
      // Store in cookies instead of localStorage
      Cookies.set('auth_token', data.token, { expires: 7 }) // 7 days expiry
      Cookies.set('user', JSON.stringify(data.user), { expires: 7 })
      
      router.push('/chat')
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    Cookies.remove('auth_token')
    Cookies.remove('user')
    router.push('/login')
  }

  // Don't render children until mounted to prevent hydration mismatch
  if (!mounted) {
    return <Loading />
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 