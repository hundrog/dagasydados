import type { Database } from './database.types'

export type GameSession = Database['public']['Tables']['game_sessions']['Row']
export type GameSessionInsert = Database['public']['Tables']['game_sessions']['Insert']
export type GameSessionUpdate = Database['public']['Tables']['game_sessions']['Update']

export type SessionMasterRef = {
  id: string
  full_name: string | null
  user_name: string | null
  avatar_url: string | null
  phone: string | null
}

export type GameSessionWithMaster = GameSession & {
  master: SessionMasterRef | null
}
