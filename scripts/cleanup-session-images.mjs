import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS ?? 30)
const BUCKET = 'game-session-images'
const FOLDER = 'sessions'
const MARKER = `/storage/v1/object/public/${BUCKET}/`
const PAGE_LIMIT = 1000
const REMOVE_BATCH_LIMIT = 1000

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return value
}

if (!Number.isFinite(RETENTION_DAYS) || RETENTION_DAYS < 0) {
  console.error(`Invalid RETENTION_DAYS: ${process.env.RETENTION_DAYS}`)
  process.exit(1)
}

const supabase = createClient(
  requireEnv('SUPABASE_URL', SUPABASE_URL),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY),
  { auth: { persistSession: false, autoRefreshToken: false } }
)

async function listAllObjects() {
  const objects = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(FOLDER, { limit: PAGE_LIMIT, offset })
    if (error) throw error
    objects.push(...data)
    if (data.length < PAGE_LIMIT) break
    offset += PAGE_LIMIT
  }
  return objects
}

async function getReferencedPaths() {
  const paths = new Set()
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('image_url')
      .not('image_url', 'is', null)
      .range(from, from + PAGE_LIMIT - 1)
    if (error) throw error
    for (const row of data) {
      const index = row.image_url.indexOf(MARKER)
      if (index !== -1) {
        paths.add(row.image_url.slice(index + MARKER.length))
      }
    }
    if (data.length < PAGE_LIMIT) break
    from += PAGE_LIMIT
  }
  return paths
}

async function removeInBatches(paths) {
  let removed = 0
  for (let i = 0; i < paths.length; i += REMOVE_BATCH_LIMIT) {
    const batch = paths.slice(i, i + REMOVE_BATCH_LIMIT)
    const { data, error } = await supabase.storage.from(BUCKET).remove(batch)
    if (error) throw error
    removed += data?.length ?? batch.length
  }
  return removed
}

try {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  const [objects, referenced] = await Promise.all([listAllObjects(), getReferencedPaths()])

  const fullPath = object => `${FOLDER}/${object.name}`

  const candidates = objects.filter((object) => {
    if (referenced.has(fullPath(object))) return false
    const createdAt = new Date(object.created_at)
    return !Number.isNaN(createdAt.getTime()) && createdAt < cutoff
  })

  const removed = await removeInBatches(candidates.map(object => fullPath(object)))

  console.log(
    `Cleanup done. Listed: ${objects.length}, unreferenced older than ${RETENTION_DAYS} days: ${candidates.length}, removed: ${removed}.`
  )
} catch (error) {
  console.error('Cleanup failed:', error.message)
  process.exit(1)
}
