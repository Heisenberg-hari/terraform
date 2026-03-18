import { apiFetch } from './client'

export async function searchUsers(query) {
  const q = encodeURIComponent(query)
  return apiFetch(`/api/observatory/search/?q=${q}`)
}

export async function listContacts() {
  return apiFetch('/api/observatory/contacts/')
}

export async function addContact(contactId, nickname = '') {
  return apiFetch('/api/observatory/contacts/add/', {
    method: 'POST',
    body: JSON.stringify({ contact_id: contactId, nickname }),
  })
}

export async function removeContact(contactId) {
  return apiFetch(`/api/observatory/contacts/${contactId}/`, {
    method: 'DELETE',
  })
}
