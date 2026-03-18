import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  world: null,
  isAuthenticated: Boolean(localStorage.getItem('terraform_access_token')),
  setSession: ({ access, refresh }) => {
    if (access) localStorage.setItem('terraform_access_token', access)
    if (refresh) localStorage.setItem('terraform_refresh_token', refresh)
    set({ isAuthenticated: true })
  },
  clearSession: () => {
    localStorage.removeItem('terraform_access_token')
    localStorage.removeItem('terraform_refresh_token')
    set({ user: null, world: null, isAuthenticated: false })
  },
  setUser: (user) => set({ user, isAuthenticated: true }),
  setWorld: (world) => set({ world }),
}))
