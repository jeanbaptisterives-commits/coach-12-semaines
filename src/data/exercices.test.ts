import { describe, it, expect } from 'vitest'
import type { Famille } from '../types'
import { EXERCICES, EXERCICES_PAR_ID } from './exercices'

const IDS_OBLIGATOIRES = [
  'kb_swing', 'kb_goblet_squat', 'kb_rowing_un_bras', 'pompes', 'planche', 'pompes_inclinees', 'pompes_genoux',
  'tirage_inverse_table', 'tractions', 'tractions_negatives', 'course_marche', 'course_continue', 'fractionne_course',
  'marche_rapide_chienne', 'velo_endurance', 'natation_crawl', 'pont_fessier', 'kb_deadlift', 'fente_arriere',
  'dead_bug', 'bird_dog', 'gainage_lateral', 'kb_farmer_walk',
]

const MINIMUM: Record<Famille, number> = {
  charniere: 5, squat: 5, fente: 4, tirage: 6, poussee: 7, porte: 3, gainage: 7, cardio: 7, pliometrie: 3,
  mob_epaules: 6, mob_hanches: 5, mob_thoracique: 4, echauffement: 7, retour_calme: 6,
}

describe('bibliothèque d’exercices', () => {
  it('contient au moins 85 exercices', () => {
    expect(EXERCICES.length).toBeGreaterThanOrEqual(85)
  })

  it('a des ids uniques en snake_case', () => {
    const ids = EXERCICES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/)
    expect(Object.keys(EXERCICES_PAR_ID).length).toBe(ids.length)
  })

  it('contient tous les ids obligatoires', () => {
    for (const id of IDS_OBLIGATOIRES) expect(EXERCICES_PAR_ID[id], id).toBeDefined()
  })

  it('respecte la couverture minimale par famille', () => {
    for (const [famille, min] of Object.entries(MINIMUM)) {
      const n = EXERCICES.filter((e) => e.famille === famille).length
      expect(n, famille).toBeGreaterThanOrEqual(min)
    }
  })

  it('a des alternatives valides : même famille et sûres pour les épaules', () => {
    for (const e of EXERCICES) {
      for (const alt of e.alternatives ?? []) {
        const a = EXERCICES_PAR_ID[alt]
        expect(a, `${e.id} -> ${alt}`).toBeDefined()
        expect(a.famille, `${e.id} -> ${alt}`).toBe(e.famille)
        expect(a.surEpaules, `${e.id} -> ${alt}`).toBe(true)
        expect(alt).not.toBe(e.id)
      }
    }
  })

  it('a des fiches complètes', () => {
    for (const e of EXERCICES) {
      expect(e.execution.length, e.id).toBeGreaterThanOrEqual(3)
      expect(e.erreurs.length, e.id).toBeGreaterThanOrEqual(2)
      expect(e.fourchette, e.id).toBeDefined()
      expect(e.objectif.length, e.id).toBeGreaterThan(0)
      expect(e.muscles.length, e.id).toBeGreaterThan(0)
    }
  })

  it('a un schéma SVG pour chaque exercice', () => {
    for (const e of EXERCICES) {
      expect(e.svg.startsWith('<svg'), e.id).toBe(true)
      expect(e.svg, e.id).toContain('viewBox')
      expect(e.svg, e.id).not.toMatch(/<text/)
    }
  })

  it('marque les mouvements au-dessus de la tête comme non sûrs pour les épaules', () => {
    const risque = EXERCICES.filter((e) => /press|snatch|jerk|pike|overhead/.test(e.id))
    expect(risque.length).toBeGreaterThanOrEqual(5)
    for (const e of risque) expect(e.surEpaules, e.id).toBe(false)
  })

  it('classe la pliométrie et le fractionné en intensité haute', () => {
    for (const e of EXERCICES.filter((x) => x.famille === 'pliometrie')) expect(e.intensite, e.id).toBe('haute')
    expect(EXERCICES_PAR_ID.fractionne_course.intensite).toBe('haute')
  })

  it('mesure le cardio en durée', () => {
    for (const e of EXERCICES.filter((x) => x.famille === 'cardio')) expect(e.mesure, e.id).toBe('duree')
  })

  it('n’utilise jamais de tiret long', () => {
    expect(JSON.stringify(EXERCICES)).not.toContain('\u2014')
  })
})
