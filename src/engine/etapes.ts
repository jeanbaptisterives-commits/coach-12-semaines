import type { Exercice, Seance } from '../types'

export type Bloc = 'echauffement' | 'principal' | 'retour'

export type Etape =
  | { genre: 'exercice'; index: number; serie: number; bloc: Bloc; tour?: number; tours?: number }
  | { genre: 'course' }

// Déroulé guidé : échauffement, course éventuelle, exercices, retour au calme.
// Séance C : circuit en tours (un passage par exercice à chaque tour), mobilité à la fin.
export function construireEtapes(seance: Seance, parId: (id: string) => Exercice | undefined): Etape[] {
  const { plan } = seance
  const nE = plan.echauffement.length
  const nP = plan.principal.length
  const etapes: Etape[] = []
  for (let i = 0; i < nE; i++) etapes.push({ genre: 'exercice', index: i, serie: 0, bloc: 'echauffement' })
  if (plan.course) etapes.push({ genre: 'course' })

  const principaux = Array.from({ length: nP }, (_, k) => nE + k)
  if (seance.type === 'C') {
    const circuit = principaux.filter((i) => !parId(seance.exercices[i].exerciceId)?.famille.startsWith('mob_'))
    const mobilite = principaux.filter((i) => !circuit.includes(i))
    const tours = Math.max(0, ...circuit.map((i) => seance.exercices[i].prevu.series))
    for (let t = 0; t < tours; t++)
      for (const i of circuit) if (t < seance.exercices[i].prevu.series) etapes.push({ genre: 'exercice', index: i, serie: t, bloc: 'principal', tour: t + 1, tours })
    for (const i of mobilite) etapes.push({ genre: 'exercice', index: i, serie: 0, bloc: 'principal' })
  } else {
    for (const i of principaux)
      for (let s = 0; s < seance.exercices[i].prevu.series; s++) etapes.push({ genre: 'exercice', index: i, serie: s, bloc: 'principal' })
  }
  for (let k = 0; k < plan.retourCalme.length; k++) etapes.push({ genre: 'exercice', index: nE + nP + k, serie: 0, bloc: 'retour' })
  return etapes
}

// Segments du minuteur de course : alternance course / marche, ou un seul bloc continu.
export interface Segment {
  genre: 'course' | 'marche'
  sec: number
  bloc: number
}

export function segmentsCourse(c: { courseSec: number; marcheSec: number; blocs: number; continueMin: number }): Segment[] {
  if (c.continueMin > 0) return [{ genre: 'course', sec: c.continueMin * 60, bloc: 1 }]
  const s: Segment[] = []
  for (let b = 1; b <= c.blocs; b++) {
    s.push({ genre: 'course', sec: c.courseSec, bloc: b })
    if (b < c.blocs) s.push({ genre: 'marche', sec: c.marcheSec, bloc: b })
  }
  return s
}
