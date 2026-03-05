import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // happy-dom is a lighter jsdom alternative that handles ESM dependencies correctly
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['modules/**/*.ts', 'modules/**/*.tsx', 'lib/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/adapters/supabase.adapter.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
