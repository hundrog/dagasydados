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
  fecha_inicio: string
  fecha_fin: string
  hora_inicio: string | null
  hora_fin: string | null
  zona_horaria: string | null
  image_url: string | null
}

export type GameSessionWithMaster = GameSession & {
  master: SessionMasterRef | null
  session_players?: Array<{ count: number }> | null
  player_count?: number | null
  event?: SessionEventRef | null
}
