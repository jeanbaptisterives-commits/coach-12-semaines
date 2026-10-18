import Dexie, { type EntityTable } from 'dexie'
import type { EtatCourse, EtatExercice, JournalJour, Pesee, Profil, Seance, Test } from '../types'

// Tout reste dans IndexedDB, sur le téléphone. Aucun envoi réseau.
export class BaseCoach extends Dexie {
  profil!: EntityTable<Profil, 'id'>
  seances!: EntityTable<Seance, 'id'>
  etats!: EntityTable<EtatExercice, 'exerciceId'>
  course!: EntityTable<EtatCourse, 'id'>
  journal!: EntityTable<JournalJour, 'date'>
  pesees!: EntityTable<Pesee, 'date'>
  tests!: EntityTable<Test, 'id'>

  constructor(nom = 'coach-12-semaines') {
    super(nom)
    this.version(1).stores({
      profil: 'id',
      seances: '++id, date, type',
      etats: 'exerciceId',
      course: 'id',
      journal: 'date',
      pesees: 'date',
      tests: '++id, semaine, date',
    })
  }
}

export const db = new BaseCoach()

export const TABLES = ['profil', 'seances', 'etats', 'course', 'journal', 'pesees', 'tests'] as const

export interface Sauvegarde {
  app: 'coach-12-semaines'
  version: 1
  exporteLe: string
  donnees: Record<(typeof TABLES)[number], unknown[]>
}

export async function exporter(base: BaseCoach = db): Promise<Sauvegarde> {
  const donnees = {} as Sauvegarde['donnees']
  for (const t of TABLES) donnees[t] = await base.table(t).toArray()
  return { app: 'coach-12-semaines', version: 1, exporteLe: new Date().toISOString(), donnees }
}

// Import complet : remplace tout, dans une seule transaction (rien n'est perdu si le fichier est invalide).
export async function importer(json: unknown, base: BaseCoach = db): Promise<void> {
  const s = json as Partial<Sauvegarde>
  if (!s || s.app !== 'coach-12-semaines' || !s.donnees) throw new Error('Ce fichier n’est pas une sauvegarde de l’app.')
  for (const t of TABLES) if (!Array.isArray(s.donnees[t])) throw new Error(`Sauvegarde incomplète : ${t} manquant.`)
  await base.transaction('rw', TABLES.map((t) => base.table(t)), async () => {
    for (const t of TABLES) {
      await base.table(t).clear()
      await base.table(t).bulkAdd(s.donnees![t])
    }
  })
}
