import type { GameSessionWithMaster } from '~/types/session'

export const hasDedicatedSection = (session: GameSessionWithMaster): boolean =>
  Boolean(session.event?.highlight_sessions)
