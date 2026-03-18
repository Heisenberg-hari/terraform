import { apiFetch } from './client'

export async function registerUser({ username, display_name, password }) {
  return apiFetch('/api/core/register/', {
    method: 'POST',
    body: JSON.stringify({ username, display_name, password }),
  })
}

export async function loginUser({ username, password }) {
  return apiFetch('/api/core/token/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function fetchMe() {
  return apiFetch('/api/core/me/')
}

export async function fetchMyWorld() {
  return apiFetch('/api/world/me/')
}
