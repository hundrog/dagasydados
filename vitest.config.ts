import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const appDir = path.resolve(rootDir, 'app')

// Carga .env/.env.local/.env.test para que los integration tests encuentren
// SUPABASE_TEST_* en local sin tener que exportarlos manualmente.
// No sobreescribe variables ya presentes en el entorno real.
for (const file of ['.env', '.env.local', '.env.test']) {
  try {
    process.loadEnvFile(`${process.cwd()}/${file}`)
  } catch {
    // El archivo no existe o no puede leerse; se ignora.
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '~': appDir,
      '@': appDir
    }
  },
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts', 'server/**/*.test.ts', 'supabase/**/*.test.ts', '**/__tests__/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000
  }
})
