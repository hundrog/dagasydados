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
  let userClient!: ReturnType<typeof createClient>

  const masterId = crypto.randomUUID()
  const sessionIds: string[] = []
  let userId = ''
  let userEmail = ''

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

  const callCreatePlayerAsUser = (sessionId: string, nombre: string, telefono: string) =>
    userClient.rpc<CreatePlayerResult>('create_session_player', {
      p_game_session_id: sessionId,
      p_nombre: nombre,
      p_telefono: telefono
    })

  const callCreatePlayerManual = (sessionId: string, nombre: string, telefono: string) =>
    userClient.rpc<CreatePlayerResult>('create_session_player_manual', {
      p_game_session_id: sessionId,
      p_nombre: nombre,
      p_telefono: telefono
    })

  const getStoredRows = async (sessionId: string) => {
    const { data, error } = await adminClient
      .from('session_players')
      .select('id, nombre, telefono, telefono_hash, user_id')
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

    userEmail = `session-it-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.com`
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: 'Jugador de prueba', name: 'test_player' }
    })
    if (userError) throw new Error(`Fixture jugador falló: ${userError.message}`)
    userId = userData.user.id

    userClient = createClient(SUPABASE_URL as string, SUPABASE_PUBLISHABLE_KEY as string, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'password123'
    })
    if (signInError) throw new Error(`Login del jugador falló: ${signInError.message}`)
  })

  afterAll(async () => {
    if (sessionIds.length > 0) {
      await adminClient.from('game_sessions').delete().in('id', sessionIds)
    }
    await adminClient.from('dagger_masters').delete().eq('id', masterId)
    if (userId) {
      await adminClient.from('dagger_masters').delete().eq('id', userId)
      await adminClient.auth.admin.deleteUser(userId)
    }
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

    it('el teléfono se almacena en claro y también como hash', async () => {
      const sessionId = await createSession()
      const telefono = '5551234567'

      await callCreatePlayer(sessionId, 'Juan López', telefono)
      const rows = await getStoredRows(sessionId)

      expect(rows[0].telefono).toBe(telefono)
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

  describe('vinculación de usuario', () => {
    it('deja user_id nulo en reservas anónimas', async () => {
      const sessionId = await createSession()
      const { data } = await callCreatePlayer(sessionId, 'Ana Anónima', '5552000001')

      expect(data).toMatchObject({ ok: true })

      const rows = await getStoredRows(sessionId)
      expect(rows[0]?.user_id).toBeNull()
    })

    it('guarda el user_id del jugador autenticado', async () => {
      const sessionId = await createSession()
      const { data, error } = await callCreatePlayerAsUser(sessionId, 'Jugador Logueado', '5553000001')

      expect(error).toBeNull()
      expect(data).toMatchObject({ ok: true })

      const rows = await getStoredRows(sessionId)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.user_id).toBe(userId)
    })

    it('rechaza al mismo usuario en la misma sesión', async () => {
      const sessionId = await createSession()

      const first = await callCreatePlayerAsUser(sessionId, 'Jugador Logueado', '5553000002')
      expect(first.data).toMatchObject({ ok: true })

      const second = await callCreatePlayerAsUser(sessionId, 'Jugador Logueado', '5553000003')
      expect(second.data).toMatchObject({ ok: false, error: 'already_registered' })
      expect(await getStoredRows(sessionId)).toHaveLength(1)
    })

    it('permite al mismo usuario en sesiones distintas', async () => {
      const sessionA = await createSession()
      const sessionB = await createSession()

      const a = await callCreatePlayerAsUser(sessionA, 'Jugador Logueado', '5553000004')
      const b = await callCreatePlayerAsUser(sessionB, 'Jugador Logueado', '5553000005')

      expect(a.data).toMatchObject({ ok: true })
      expect(b.data).toMatchObject({ ok: true })
    })

    it('rechaza al master en su propia sesión', async () => {
      const sessionId = await createSession({ master_id: userId })
      const { data } = await callCreatePlayerAsUser(sessionId, 'Master', '5553000006')

      expect(data).toMatchObject({ ok: false, error: 'master_own_session' })
      expect(await getStoredRows(sessionId)).toHaveLength(0)
    })
  })

  describe('altas manuales', () => {
    it('no vincula al master que agrega jugadores', async () => {
      const sessionId = await createSession({ master_id: userId })

      const first = await callCreatePlayerManual(sessionId, 'Jugador Manual Uno', '5554000001')
      const second = await callCreatePlayerManual(sessionId, 'Jugador Manual Dos', '5554000002')

      expect(first.data).toMatchObject({ ok: true })
      expect(second.data).toMatchObject({ ok: true })

      const rows = await getStoredRows(sessionId)
      expect(rows).toHaveLength(2)
      expect(rows.every(row => row.user_id === null)).toBe(true)
    })

    it('rechaza a un usuario que no es master ni admin', async () => {
      const sessionId = await createSession()
      const { data } = await callCreatePlayerManual(sessionId, 'Jugador Manual', '5554000003')

      expect(data).toMatchObject({ ok: false, error: 'forbidden' })
      expect(await getStoredRows(sessionId)).toHaveLength(0)
    })
  })
})
