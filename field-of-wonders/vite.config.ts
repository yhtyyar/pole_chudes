import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { gameLogPlugin } from './src/plugins/gameLogPlugin'

// https://vite.dev/config/
export default defineConfig({
  base: '/pole_chudes/',
  plugins: [react(), gameLogPlugin()],
  build: {
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
