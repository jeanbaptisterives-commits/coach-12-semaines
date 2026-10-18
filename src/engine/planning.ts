import type { Profil, Seance, TypeSeance } from '../types'
import { ajouterJours, jourSemaine, semaineDe } from './dates'

const ORDRE: TypeSeance[] = ['A', 'B', 'C']

// Jours triés du lundi au dimanche.
export function joursTries(profil: Profil): number[] {
  return [...profil.jours].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
}

// Séance prévue ce jour-là : A, B, C dans l'ordre des jours de la semaine (mardi A, jeudi B, samedi C par défaut).
export function typeDuJour(profil: Profil, iso: string): TypeSeance | null {
  if (profil.programme === 'carte') return null // à la carte : rien d'imposé, JB choisit selon son envie
  const i = joursTries(profil).indexOf(jourSemaine(iso))
  return i === -1 ? null : ORDRE[i % ORDRE.length]
}

export function joursPrevus(profil: Profil, de: string, a: string): string[] {
  const res: string[] = []
  for (let d = de; d <= a; d = ajouterJours(d, 1)) if (typeDuJour(profil, d)) res.push(d)
  return res
}

// Une séance d'étirement ne remplace pas une séance du programme.
function faiteLe(seances: Seance[], iso: string): boolean {
  return seances.some((s) => s.date === iso && s.terminee && s.type !== 'etirement')
}

// Une séance prévue dans les 2 derniers jours n'a pas été faite, et rien n'est encore fait aujourd'hui :
// on propose la séance express de 15 min plutôt que rien.
export function seanceManquee(profil: Profil, seances: Seance[], aujourdhui: string): string | null {
  if (faiteLe(seances, aujourdhui)) return null
  for (let i = 1; i <= 2; i++) {
    const d = ajouterJours(aujourdhui, -i)
    if (d < profil.dateDebut) break
    if (typeDuJour(profil, d) && !faiteLe(seances, d)) {
      const rattrapee = seances.some((s) => s.terminee && s.type !== 'etirement' && s.date > d && s.date < aujourdhui)
      return rattrapee ? null : d
    }
  }
  return null
}

export interface ProchaineSeance {
  date: string
  type: TypeSeance
  semaine: number
}

export function prochaineSeance(profil: Profil, seances: Seance[], aujourdhui: string): ProchaineSeance | null {
  for (let i = 0; i < 8; i++) {
    const d = ajouterJours(aujourdhui, i)
    const t = typeDuJour(profil, d)
    if (t && !(i === 0 && faiteLe(seances, d))) return { date: d, type: t, semaine: semaineDe(profil.dateDebut, d) }
  }
  return null
}

// Série de régularité : séances prévues faites d'affilée, en remontant depuis la plus récente.
// Une express faite dans les 2 jours qui suivent rattrape la séance manquée.
export function serieReguliere(profil: Profil, seances: Seance[], aujourdhui: string): number {
  const prevus = joursPrevus(profil, profil.dateDebut, aujourdhui).reverse()
  let n = 0
  for (const d of prevus) {
    const ok =
      faiteLe(seances, d) || seances.some((s) => s.terminee && s.date > d && s.date <= ajouterJours(d, 2) && s.type === 'express')
    if (ok) n++
    else if (d === aujourdhui) continue // la séance du jour n'est pas encore ratée
    else break
  }
  return n
}
