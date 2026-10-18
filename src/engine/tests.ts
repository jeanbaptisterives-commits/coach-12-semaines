import type { Profil, Test } from '../types'
import { semaineDe } from './dates'

export const SEMAINES_TEST = [0, 4, 8, 12] as const

// Test à faire maintenant : S0 avant ou pendant la semaine 1, puis en fin des semaines 4, 8 et 12.
export function testAttendu(profil: Profil, tests: Test[], aujourdhui: string): Test['semaine'] | null {
  const semaine = semaineDe(profil.dateDebut, aujourdhui)
  const fait = (s: number) => tests.some((t) => t.semaine === s)
  if (!fait(0)) return 0
  for (const s of [4, 8, 12] as const) if (semaine >= s && !fait(s)) return s
  return null
}

export function distanceTest(semaine: Test['semaine']): 2 | 5 {
  return semaine === 12 ? 5 : 2
}
