const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

let accessToken = localStorage.getItem('accessToken') || null

export function setAccessToken(token) {
  accessToken = token
  if (token) localStorage.setItem('accessToken', token)
  else localStorage.removeItem('accessToken')
}

export function getAccessToken() {
  return accessToken
}

async function refreshAccessToken() {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    setAccessToken(null)
    localStorage.removeItem('user')
    throw new Error('Session expired')
  }
  const data = await res.json()
  setAccessToken(data.data.accessToken)
  localStorage.setItem('user', JSON.stringify(data.data.user))
  return data.data.accessToken
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 401 && !options._retry) {
    try {
      await refreshAccessToken()
      return api(path, { ...options, _retry: true })
    } catch {
      // fall through
    }
  }

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(payload.message || 'Request failed')
    error.status = res.status
    error.payload = payload
    throw error
  }
  return payload
}
