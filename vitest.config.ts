import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts', 'server/**/*.test.ts', '**/__tests__/**/*.test.ts']
  }
})
