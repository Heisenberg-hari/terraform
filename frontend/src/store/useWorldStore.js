import { create } from 'zustand'

export const useWorldStore = create((set) => ({
  formations: [],
  loading: false,
  setLoading: (loading) => set({ loading }),
  setFormations: (formations) => set({ formations }),
  prependFormation: (formation) =>
    set((state) => ({ formations: [formation, ...state.formations] })),
}))
