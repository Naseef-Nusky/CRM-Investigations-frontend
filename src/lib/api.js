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

function buildError(payload, res) {
  const error = new Error(payload.message || 'Request failed')
  error.status = res.status
  error.payload = payload
  return error
}

// Multipart upload (FormData). Browser sets the Content-Type boundary itself.
export async function apiUpload(path, formData, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'POST',
    body: formData,
    headers,
    credentials: 'include',
  })

  if (res.status === 401 && !options._retry) {
    try {
      await refreshAccessToken()
      return apiUpload(path, formData, { ...options, _retry: true })
    } catch {
      // fall through
    }
  }

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw buildError(payload, res)
  return payload
}

function filenameFromDisposition(header) {
  if (!header) return null
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (star) {
    try {
      return decodeURIComponent(star[1])
    } catch {
      // ignore
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain ? plain[1] : null
}

// Authenticated download: fetches with the bearer token and triggers a browser save.
export async function apiDownload(path, fallbackName = 'download', options = {}) {
  const headers = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${API_URL}${path}`, { headers, credentials: 'include' })

  if (res.status === 401 && !options._retry) {
    try {
      await refreshAccessToken()
      return apiDownload(path, fallbackName, { _retry: true })
    } catch {
      // fall through
    }
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw buildError(payload, res)
  }

  const blob = await res.blob()
  const filename = filenameFromDisposition(res.headers.get('Content-Disposition')) || fallbackName
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
