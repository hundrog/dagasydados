import type { Database } from './database.types'

export type GameSession = Database['public']['Tables']['game_sessions']['Row']
export type GameSessionInsert = Database['public']['Tables']['game_sessions']['Insert']
export type GameSessionUpdate = Database['public']['Tables']['game_sessions']['Update']

export type SessionPlayer = Database['public']['Tables']['session_players']['Row']

export type SessionMasterRef = {
  id: string
  full_name: string | null
  user_name: string | null
  avatar_url: string | null
  phone: string | null
  plataforma_pago: string | null
  plataforma_pago_cuenta: string | null
}

export type SessionEventRef = {
  id: string
  name: string
  description: string | null
  start_datetime: string
  end_datetime: string
  image_url: string | null
}

export type GameSessionWithMaster = GameSession & {
  master: SessionMasterRef | null
  session_players?: Array<{ count: number }> | null
  player_count?: number | null
  event?: SessionEventRef | null
}
