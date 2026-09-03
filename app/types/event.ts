import type { Database } from '~/types/database.types'

export type Event = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']

export type EventWithSessions = Event & {
  game_sessions?: Array<{ count: number }> | null
}
