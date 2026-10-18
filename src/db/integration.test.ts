import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { EXERCICES_PAR_ID } from '../data/exercices'
import type { Profil, Seance } from '../types'
import { preparerSeance, terminerSeance } from './actions'
import { BaseCoach, exporter, importer } from './db'

const PROFIL: Profil = {
  id: 'moi',
  poidsDepart: 82,
  tailleCm: 180,
  kettlebells: [8, 12, 16],
  jours: [2, 4, 6],
  feuVertMedical: false,
  barreTraction: false,
  dateDebut: '2026-10-19',
  creeLe: '2026-10-18',
}

let base: BaseCoach
let n = 0
beforeEach(async () => {
  base = new BaseCoach(`test-${n++}`)
  await base.profil.put(PROFIL)
})

// Remplit toutes les séries comme prévu, avec le ressenti donné.
function faire(s: Seance, rpe: number, douleurSur?: string): Seance {
  return {
    ...s,
    zeroJoint: true,
    exercices: s.exercices.map((e) => ({
      ...e,
      series: Array.from({ length: e.prevu.series }, () => ({ reps: e.prevu.reps, charge: e.prevu.charge, rpe, douleur: e.exerciceId === douleurSur })),
    })),
  }
}

describe('parcours complet sur la base locale', () => {
  it('séance A réussie : la séance suivante monte et explique pourquoi', async () => {
    const s1 = await preparerSeance('A', '2026-10-20', base)
    expect(s1.plan.principal[0].exerciceId).toBe('kb_swing')
    const swing1 = s1.plan.principal[0]
    const msgs = await terminerSeance(faire(s1, 7), base)
    expect(msgs.some((m) => m.includes(EXERCICES_PAR_ID.kb_swing.nom))).toBe(true)

    const s2 = await preparerSeance('A', '2026-10-27', base)
    const swing2 = s2.plan.principal.find((p) => p.exerciceId === 'kb_swing')!
    expect(swing2.reps).toBe(swing1.reps + 1)
    expect(s2.raison).toMatch(/Progression après ta dernière séance/)
  })

  it('douleur sur les pompes : remplacées la fois suivante', async () => {
    const s1 = await preparerSeance('A', '2026-10-20', base)
    await terminerSeance(faire(s1, 7, 'pompes'), base)
    const s2 = await preparerSeance('A', '2026-10-27', base)
    expect(s2.plan.principal.map((p) => p.exerciceId)).not.toContain('pompes')
    expect(s2.raison).toMatch(/remplacé par/)
  })

  it('forme basse le matin : séance allégée, et une séance allégée ne fait pas monter les cibles', async () => {
    await base.journal.put({ date: '2026-10-19', joints: 5, mode: 'joint_tabac' })
    await base.journal.put({ date: '2026-10-20', energie: 4, sommeil: 5, heuresSommeil: 7 })
    const s1 = await preparerSeance('A', '2026-10-20', base)
    expect(s1.allegee).toBe(true)
    expect(s1.raison).toMatch(/^Forme basse/)
    await terminerSeance(faire(s1, 6), base)
    const s2 = await preparerSeance('A', '2026-10-27', base)
    const avant = s1.plan.principal.find((p) => p.exerciceId === 'kb_swing')!
    const apres = s2.plan.principal.find((p) => p.exerciceId === 'kb_swing')!
    expect(apres.reps).toBeGreaterThanOrEqual(avant.reps)
    expect(apres.series).toBe(2)
    expect(s2.raison).not.toMatch(/Progression/)
  })

  it('séance B facile : la course progresse et la raison le dit', async () => {
    const s1 = await preparerSeance('B', '2026-10-22', base)
    expect(s1.plan.course?.courseSec).toBe(60)
    await terminerSeance({ ...faire(s1, 0), course: { rpe: 4, douleur: false, terminee: true } }, base)
    const s2 = await preparerSeance('B', '2026-10-29', base)
    expect(s2.plan.course?.courseSec).toBe(90)
    expect(s2.raison).toMatch(/Course/)
  })

  it('export puis import : tout revient à l’identique', async () => {
    const s1 = await preparerSeance('A', '2026-10-20', base)
    await terminerSeance(faire(s1, 7), base)
    await base.journal.put({ date: '2026-10-20', energie: 7, sommeil: 6 })
    const sauvegarde = JSON.parse(JSON.stringify(await exporter(base)))
    const autre = new BaseCoach(`test-import-${n++}`)
    await importer(sauvegarde, autre)
    expect(await autre.seances.count()).toBe(1)
    expect(await autre.etats.count()).toBe(await base.etats.count())
    expect((await autre.journal.get('2026-10-20'))?.energie).toBe(7)
    await expect(importer({ app: 'autre' }, autre)).rejects.toThrow()
    expect(await autre.seances.count()).toBe(1)
  })
})
