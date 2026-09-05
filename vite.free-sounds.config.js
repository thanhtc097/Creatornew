import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  root: resolve(import.meta.dirname, 'free-sounds'),
  base: '/free-sounds/',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: resolve(import.meta.dirname, 'free-sounds-dist'),
    emptyOutDir: true,
    assetsDir: 'assets',
  },
})
