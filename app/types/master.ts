export type MasterProfile = {
  estilo_juego: {
    narrativo: number
    tactico: number
    roll: number
    puzzle: number
  }
  homebrew: {
    mecanicas: string
    mundo: string
  }
  referencias: {
    peliculas: string[]
    libros: string[]
    videojuegos: string[]
    series_anime: string[]
  }
}

export type Master = {
  id: string
  full_name: string | null
  user_name: string | null
  phone: string | null
  avatar_url: string | null
  profile: MasterProfile | null
}
