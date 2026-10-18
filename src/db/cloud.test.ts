import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { db } from './db'
import { demarrerCloud, ecrireCoachCloud, lireCoachCloud } from './cloud'
import { preparerSeance, terminerSeance } from './actions'

// Fausse base d'artefact en mémoire : même forme que la capacité `db` (doc/collection, get/set/delete).
const store = new Map<string, Record<string, unknown>>()
const snap = (v?: Record<string, unknown>) => ({ exists: !!v, data: () => v })
const ref = (path: string) => ({
  get: async () => snap(store.get(path)),
  set: async (d: Record<string, unknown>) => void store.set(path, JSON.parse(JSON.stringify(d))),
  delete: async () => void store.delete(path),
  onSnapshot: () => () => {},
})
const fausseDb = {
  doc: (p: string) => ref(p),
  collection: (c: string) => ({
    doc: (id: string) => ref(`${c}/${id}`),
    get: async () => ({ docs: [...store.entries()].filter(([k]) => k.startsWith(c + '/') && k.split('/').length === 2).map(([, v]) => snap(v)) }),
  }),
}
;(globalThis as unknown as { window: unknown }).window = { claude: { use: async (n: string) => (n === 'db' ? fausseDb : null) } }
;(globalThis as unknown as { document: unknown }).document = { addEventListener: () => {} }
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('synchronisation avec la base de l’artefact', () => {
  it('importe la base au démarrage, puis envoie chaque saisie', async () => {
    store.set('profil/moi', { id: 'moi', poidsDepart: 81, tailleCm: 180, kettlebells: [8, 12, 16], jours: [2, 4, 6], feuVertMedical: false, barreTraction: false, dateDebut: '2026-10-19', creeLe: '2026-10-18' })
    store.set('journal/2026-10-19', { date: '2026-10-19', joints: 3, mode: 'joint_tabac' })
    expect(await demarrerCloud(db)).toBe(true)
    expect((await db.profil.get('moi'))?.poidsDepart).toBe(81)
    expect((await db.journal.get('2026-10-19'))?.joints).toBe(3)

    await db.journal.put({ date: '2026-10-20', energie: 7, sommeil: 6 })
    await db.pesees.put({ date: '2026-10-20', kg: 80.5 })
    await attendre(1200)
    expect(store.get('journal/2026-10-20')).toMatchObject({ energie: 7 })
    expect(store.get('pesees/2026-10-20')).toMatchObject({ kg: 80.5 })
  })

  it('une séance terminée part dans la base, avec les cibles mises à jour', async () => {
    const s = await preparerSeance('A', '2026-10-20', db)
    const faite = { ...s, exercices: s.exercices.map((e) => ({ ...e, series: Array.from({ length: e.prevu.series }, () => ({ reps: e.prevu.reps, charge: e.prevu.charge, rpe: 7, douleur: false })) })) }
    await terminerSeance(faite, db)
    await attendre(1200)
    const seances = [...store.keys()].filter((k) => k.startsWith('seances/'))
    expect(seances.length).toBe(1)
    expect(store.get('etats/kb_swing')).toMatchObject({ repsCible: 11 })
  })

  it('le mot du coach se lit et s’écrit dans coach/jour', async () => {
    await ecrireCoachCloud({ date: '2026-10-20', message: 'Allez' })
    expect((await lireCoachCloud())?.message).toBe('Allez')
    expect(store.get('coach/jour')).toMatchObject({ message: 'Allez' })
  })
})
