import { apiFetch } from './client'

export async function fetchInboxMessages() {
  return apiFetch('/api/messages/')
}

export async function fetchSentMessages() {
  return apiFetch('/api/messages/sent/')
}

export async function markMessageRead(messageId) {
  return apiFetch(`/api/messages/${messageId}/read/`, {
    method: 'POST',
  })
}
