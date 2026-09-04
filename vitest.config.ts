import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts', 'server/**/*.test.ts', 'supabase/**/*.test.ts', '**/__tests__/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000
  }
})
