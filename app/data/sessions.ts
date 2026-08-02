export type SessionCtaAction
  = | { kind: 'reserve', modalTitle: string }
    | { kind: 'notice', message: string }

export interface DaggerMaster {
  user_name: string
  full_name: string
  avatar_url: string
  phone?: string
}

export interface GameSession {
  id: string
  title: string
  master: string
  image_url: string
  system?: string
  session_type?: string
  audience?: string
  mode?: string
  current_players?: number
  max_players?: number
  description?: string
  location?: string
  date?: string
  time?: string
  day?: string
  campaign?: string
  daggerMaster?: DaggerMaster
  costo?: number
}

export const sessions: GameSession[] = [
  {
    id: 'goblin-grinder',
    title: 'Goblin Grinder',
    master: 'Dirigido por Master Pino',
    image_url: '',
    system: 'Mörk Borg',
    session_type: 'One Shot',
    mode: 'online',
    location: 'Online (Discord + VTT)',
    date: 'Vie, 2 de Ago, 2026',
    time: '3:00 PM - 7:00 PM CST',
    day: 'Viernes',
    max_players: 5,
    current_players: 2,
    costo: 30,
    description: 'Acompaña a Master Pino en esta aventura de Mörk Borg, donde nos enfrentaremos a hordas de goblins y otros horrores. ¡Prepárate para una experiencia intensa y divertida!',
    daggerMaster: {
      user_name: 'Pino',
      full_name: 'Master Pino',
      avatar_url: '',
      phone: '+5215512345678'
    }
  },
  {
    id: 'mina-perdida-phandelver',
    title: 'La Mina Perdida de Phandelver',
    master: 'Dirigido por Master Alan',
    image_url: '',
    system: 'D&D 5e',
    session_type: 'Campaña',
    audience: 'Principiantes',
    mode: 'online',
    location: 'Online (Discord + VTT)',
    campaign: 'Mié (GMT-6)',
    time: '7:00 PM CST',
    max_players: 5,
    current_players: 3,
    costo: 30,
    day: 'Miércoles',
    description: 'Acompaña a Master Alan en esta aventura de D&D 5e para principiantes, donde exploraremos la famosa Mina Perdida de Phandelver. ¡No necesitas experiencia previa!',
    daggerMaster: {
      user_name: 'Moz',
      full_name: 'Master Alan',
      avatar_url: '',
      phone: '+5215512345678'
    }
  },
  {
    id: 'cronicas-multiverso',
    title: 'Crónicas del Multiverso: Mesa Abierta',
    master: 'Dirigido por Varios Masters de la Comunidad',
    image_url: '',
    system: 'Daggerheart',
    session_type: 'Mesa Abierta',
    mode: 'hybrid',
    location: 'Online y Presencial',
    campaign: 'Sistemas Varios',
    day: 'Sábados',
    max_players: 6,
    current_players: 2,
    costo: 50,
    description: 'Únete a esta mesa abierta donde diferentes Masters de la comunidad dirigirán sesiones de diversos sistemas. ¡Explora nuevas aventuras y conoce a otros jugadores!',
    daggerMaster: {
      user_name: 'varios',
      full_name: 'Varios Masters de la Comunidad',
      avatar_url: '',
      phone: '+5215512345678'
    }
  }
]
