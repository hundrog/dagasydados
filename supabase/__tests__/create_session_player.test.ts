import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Las credenciales deben venir de variables de entorno. Sin ellas, el suite
// se salta (no corre) en lugar de usar keys por defecto.
const SUPABASE_URL = process.env.SUPABASE_TEST_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_TEST_PUBLISHABLE_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_KEY

const hasTestConfig = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && SUPABASE_SERVICE_KEY)

type CreatePlayerResult = { ok: boolean, id?: string, error?: string, message?: string }

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

async function isSupabaseReachable(): Promise<boolean> {
  if (!hasTestConfig || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return false
  try {
    const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    const { data } = await client.from('game_sessions').select('id').limit(1)
    return data !== null
  } catch {
    return false
  }
}

const available = await isSupabaseReachable()

describe.skipIf(!available)('create_session_player (integration)', () => {
  // Se inicializan lazy en beforeAll para no intentar conectar (ni reventar en
  // colección) cuando el suite está skipeado por falta de credenciales.
  let publicClient!: ReturnType<typeof createClient>
  let adminClient!: ReturnType<typeof createClient>

  const masterId = crypto.randomUUID()
  const sessionIds: string[] = []

  const createSession = async (overrides: Record<string, unknown> = {}) => {
    const { data, error } = await adminClient
      .from('game_sessions')
      .insert({
        title: 'Sesión de prueba',
        master_id: masterId,
        fecha_inicio: todayStr,
        max_players: null,
        status: 'published',
        ...overrides
      })
      .select('id')
      .single()

    if (error) throw new Error(`No se pudo crear sesión fixture: ${error.message}`)
    sessionIds.push(data.id)
    return data.id
  }

  const callCreatePlayer = (sessionId: string, nombre: string, telefono: string) =>
    publicClient.rpc<CreatePlayerResult>('create_session_player', {
      p_game_session_id: sessionId,
      p_nombre: nombre,
      p_telefono: telefono
    })

  const getStoredRows = async (sessionId: string) => {
    const { data, error } = await adminClient
      .from('session_players')
      .select('id, nombre, telefono_hash')
      .eq('game_session_id', sessionId)
    if (error) throw new Error(`No se pudo leer fixtures: ${error.message}`)
    return data ?? []
  }

  beforeAll(async () => {
    publicClient = createClient(SUPABASE_URL as string, SUPABASE_PUBLISHABLE_KEY as string)
    adminClient = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_KEY as string)

    const { error } = await adminClient.from('dagger_masters').insert({
      id: masterId,
      full_name: 'Master de prueba',
      user_name: 'test_master'
    })
    if (error) throw new Error(`Fixture master falló: ${error.message}`)
  })

  afterAll(async () => {
    if (sessionIds.length > 0) {
      await adminClient.from('game_sessions').delete().in('id', sessionIds)
    }
    await adminClient.from('dagger_masters').delete().eq('id', masterId)
  })

  describe('validación de entrada', () => {
    it('crea un jugador y devuelve ok:true con su id', async () => {
      const sessionId = await createSession()
      const { data, error } = await callCreatePlayer(sessionId, 'Ana Pérez', '+52 55 1234-5678')

      expect(error).toBeNull()
      expect(data).toMatchObject({ ok: true })
      expect(data.id).toBeTruthy()

      const rows = await getStoredRows(sessionId)
      expect(rows).toHaveLength(1)
      expect(rows[0].nombre).toBe('Ana Pérez')
    })

    it('el teléfono se almacena como hash, nunca en texto plano', async () => {
      const sessionId = await createSession()
      const telefono = '5551234567'

      await callCreatePlayer(sessionId, 'Juan López', telefono)
      const rows = await getStoredRows(sessionId)

      expect(rows[0].telefono_hash).toBeTruthy()
      expect(rows[0].telefono_hash).not.toBe(telefono)
      expect(rows[0].telefono_hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('rechaza nombre vacío', async () => {
      const sessionId = await createSession()
      const { data, error } = await callCreatePlayer(sessionId, '   ', '5551234567')

      expect(error).toBeNull()
      expect(data).toMatchObject({ ok: false, error: 'invalid' })
      expect(await getStoredRows(sessionId)).toHaveLength(0)
    })

    it('rechaza teléfono vacío', async () => {
      const sessionId = await createSession()
      const { data, error } = await callCreatePlayer(sessionId, 'Ana Pérez', '  ')

      expect(error).toBeNull()
      expect(data).toMatchObject({ ok: false, error: 'invalid' })
      expect(await getStoredRows(sessionId)).toHaveLength(0)
    })

    it('sanitiza el nombre: elimina control chars y lo recorta', async () => {
      const sessionId = await createSession()

      await callCreatePlayer(sessionId, '  A\nB\tC  ', '5551112233')
      await callCreatePlayer(sessionId, 'x'.repeat(100), '5552223344')

      const rows = await getStoredRows(sessionId)
      const sorted = [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre))

      expect(sorted[0].nombre).toBe('ABC')
      expect(sorted[1].nombre).toHaveLength(80)
    })

    it('trunca el teléfono a 20 caracteres', async () => {
      const sessionId = await createSession()

      const { data, error } = await callCreatePlayer(sessionId, 'Juan López', '1'.repeat(25))

      expect(error).toBeNull()
      expect(data).toMatchObject({ ok: true })

      const rows = await getStoredRows(sessionId)
      expect(rows[0].telefono_hash).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  describe('capacidad', () => {
    it('rechaza con error full cuando la sesión alcanza max_players', async () => {
      const sessionId = await createSession({ max_players: 2 })

      await callCreatePlayer(sessionId, 'Jugador Uno', '5550000001')
      await callCreatePlayer(sessionId, 'Jugador Dos', '5550000002')
      const { data, error } = await callCreatePlayer(sessionId, 'Jugador Tres', '5550000003')

      expect(error).toBeNull()
      expect(data).toMatchObject({ ok: false, error: 'full' })
      expect(await getStoredRows(sessionId)).toHaveLength(2)
    })

    it('cuenta los jugadores anónimos hacia la capacidad', async () => {
      const sessionId = await createSession({ max_players: 3, anonymous_players: 2 })

      const first = await callCreatePlayer(sessionId, 'Jugador Uno', '5550000001')
      expect(first.data).toMatchObject({ ok: true })

      const second = await callCreatePlayer(sessionId, 'Jugador Dos', '5550000002')
      expect(second.data).toMatchObject({ ok: false, error: 'full' })

      expect(await getStoredRows(sessionId)).toHaveLength(1)
    })

    it('permite reservas sin límite cuando max_players es null', async () => {
      const sessionId = await createSession({ max_players: null })

      for (let i = 0; i < 10; i++) {
        const { data, error } = await callCreatePlayer(sessionId, `Jugador ${i}`, `55510000${String(i).padStart(3, '0')}`)
        expect(error).toBeNull()
        expect(data).toMatchObject({ ok: true })
      }

      expect(await getStoredRows(sessionId)).toHaveLength(10)
    })
  })

  describe('duplicados', () => {
    it('rechaza el mismo teléfono en la misma sesión', async () => {
      const sessionId = await createSession()

      const first = await callCreatePlayer(sessionId, 'Ana Pérez', '5551234567')
      expect(first.data).toMatchObject({ ok: true })

      const second = await callCreatePlayer(sessionId, 'Ana Pérez García', '5551234567')
      expect(second.data).toMatchObject({ ok: false, error: 'duplicate' })

      expect(await getStoredRows(sessionId)).toHaveLength(1)
    })

    it('permite el mismo teléfono en sesiones distintas', async () => {
      const sessionA = await createSession()
      const sessionB = await createSession()

      const a = await callCreatePlayer(sessionA, 'Ana Pérez', '5551234567')
      const b = await callCreatePlayer(sessionB, 'Ana Pérez', '5551234567')

      expect(a.data).toMatchObject({ ok: true })
      expect(b.data).toMatchObject({ ok: true })
    })
  })
})
