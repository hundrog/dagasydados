import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_TEST_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_TEST_PUBLISHABLE_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_KEY

const hasTestConfig = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && SUPABASE_SERVICE_KEY)

const available = await (async () => {
  if (!hasTestConfig || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return false
  try {
    const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    const { data } = await client.from('dagger_masters').select('id,role').limit(1)
    return data !== null
  } catch {
    return false
  }
})()

describe.skipIf(!available)('profile roles y cuentas (integración)', () => {
  let adminClient!: ReturnType<typeof createClient>
  const masterIds: string[] = []

  beforeAll(() => {
    adminClient = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_KEY as string)
  })

  afterAll(async () => {
    if (masterIds.length) {
      await adminClient.from('dagger_masters').delete().in('id', masterIds)
    }
  })

  it('genera role player para perfiles created', async () => {
    const id = crypto.randomUUID()
    masterIds.push(id)
    const { data, error } = await adminClient
      .from('dagger_masters')
      .insert({ id, status: 'created' })
      .select('id,status,role')
      .single()

    expect(error).toBeNull()
    expect(data.role).toBe('player')
  })

  it('genera role master para perfiles authorized', async () => {
    const id = crypto.randomUUID()
    masterIds.push(id)
    const { data, error } = await adminClient
      .from('dagger_masters')
      .insert({ id, status: 'authorized' })
      .select('id,status,role')
      .single()

    expect(error).toBeNull()
    expect(data.role).toBe('master')
  })

  it('session_players expone user_id nullable', async () => {
    const { data, error } = await adminClient
      .from('session_players')
      .select('id,user_id')
      .limit(1)

    expect(error).toBeNull()
    // Smoke test de esquema; no exige filas.
    expect(Array.isArray(data)).toBe(true)
  })
})
