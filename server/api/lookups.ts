const lookups = {
  systems: ['Daggerheart', 'Mork Borg', 'Vaesen'],
  session_types: ['One Shot', 'Two Shot', 'Campaña', 'West Marches', 'Mesa Abierta'],
  audiences: ['Todo Público', 'Novatos', 'Experimentados'],
  modes: [
    { label: 'Online', value: 'online' },
    { label: 'Presencial', value: 'offline' },
    { label: 'Híbrido', value: 'hybrid' }
  ]
}

export default defineEventHandler(() => {
  return lookups
})
