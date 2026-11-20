import { createContext, useContext, useEffect, useState } from 'react'
import { api, setAccessToken, getAccessToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function bootstrap() {
      if (!getAccessToken()) {
        setLoading(false)
        return
      }
      try {
        const res = await api('/auth/me')
        setUser(res.data.user)
        localStorage.setItem('user', JSON.stringify(res.data.user))
      } catch {
        setAccessToken(null)
        setUser(null)
        localStorage.removeItem('user')
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [])

  async function login(email, password, totpCode) {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        ...(totpCode ? { totpCode } : {}),
      }),
    })
    setAccessToken(res.data.accessToken)
    setUser(res.data.user)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    return res.data.user
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    setAccessToken(null)
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
