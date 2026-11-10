import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    outDir: 'dist',
  },
  // Dev-only: api-client.ts calls relative `/api/v1/...` paths, so
  // VITE_API_MODE=live needs this to reach apps/api locally (CONTRIBUTING.md).
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
