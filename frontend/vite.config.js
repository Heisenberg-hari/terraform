import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three-core'
          if (id.includes('node_modules/@react-three')) return 'r3f'
          if (id.includes('node_modules/@react-three/drei')) return 'drei'
          if (id.includes('node_modules')) return 'vendor'
          return undefined
        },
      },
    },
  },
})
