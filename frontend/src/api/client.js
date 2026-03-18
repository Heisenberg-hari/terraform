const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

function parseJsonSafe(text) {
  try {
    return JSON.parse(text)
  } catch {
    return { detail: text || 'Unknown error' }
  }
}

function toErrorMessage(payload, status) {
  if (!payload) return `Request failed: ${status}`
  if (typeof payload === 'string') return payload
  if (payload.detail && typeof payload.detail === 'string') return payload.detail

  // DRF serializer error shape: { field: ["msg"] }
  if (typeof payload === 'object') {
    const entries = Object.entries(payload)
    if (entries.length) {
      const [field, value] = entries[0]
      if (Array.isArray(value) && value.length) return `${field}: ${value[0]}`
      if (typeof value === 'string') return `${field}: ${value}`
    }
  }

  return `Request failed: ${status}`
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem('terraform_refresh_token')
  if (!refresh) return null

  const response = await fetch(`${API_BASE}/api/core/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!response.ok) return null

  const payload = await response.json()
  if (payload.access) {
    localStorage.setItem('terraform_access_token', payload.access)
    return payload.access
  }
  return null
}

export async function apiFetch(path, options = {}, hasRetried = false) {
  const token = localStorage.getItem('terraform_access_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (response.status === 401 && !hasRetried) {
    const freshAccess = await refreshAccessToken()
    if (freshAccess) {
      return apiFetch(path, options, true)
    }
  }

  if (!response.ok) {
    const text = await response.text()
    const payload = parseJsonSafe(text)
    throw new Error(toErrorMessage(payload, response.status))
  }

  if (response.status === 204) return null
  return response.json()
}

export { API_BASE }
