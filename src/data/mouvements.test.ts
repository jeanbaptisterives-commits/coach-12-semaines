import { describe, it, expect } from 'vitest'
import type { Famille } from '../types'
import { EXERCICES, EXERCICES_PAR_ID } from './exercices'
import { MOUVEMENTS, MOUVEMENTS_PAR_ID } from './mouvements'

const NIVEAUX = ['facile', 'moyen', 'difficile'] as const

describe('mouvements (rangement coach)', () => {
  it('contient au moins 22 mouvements aux ids uniques', () => {
    expect(MOUVEMENTS.length).toBeGreaterThanOrEqual(22)
    const ids = MOUVEMENTS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/)
    expect(Object.keys(MOUVEMENTS_PAR_ID).length).toBe(ids.length)
  })

  it('a 3 variantes existantes, distinctes, sûres pour les épaules et de la famille du mouvement', () => {
    for (const m of MOUVEMENTS) {
      const ids = NIVEAUX.map((n) => m.variantes[n])
      expect(new Set(ids).size, m.id).toBe(3)
      for (const id of ids) {
        const e = EXERCICES_PAR_ID[id]
        expect(e, `${m.id} -> ${id}`).toBeDefined()
        expect(e.surEpaules, `${m.id} -> ${id}`).toBe(true)
        expect(e.famille, `${m.id} -> ${id}`).toBe(m.famille)
      }
    }
  })

  it('range les variantes par difficulté croissante (niveau jamais en baisse)', () => {
    for (const m of MOUVEMENTS) {
      const [f, mo, d] = NIVEAUX.map((n) => EXERCICES_PAR_ID[m.variantes[n]].niveau)
      expect(f, m.id).toBeLessThanOrEqual(mo)
      expect(mo, m.id).toBeLessThanOrEqual(d)
    }
  })

  it('n’utilise chaque exercice que dans un seul mouvement', () => {
    const tous = MOUVEMENTS.flatMap((m) => NIVEAUX.map((n) => m.variantes[n]))
    expect(new Set(tous).size).toBe(tous.length)
  })

  it('a des exercices cohérents avec leur mouvement et leur variante', () => {
    for (const e of EXERCICES) {
      if (e.variante) expect(e.mouvement, e.id).toBeDefined()
      if (!e.mouvement) continue
      const m = MOUVEMENTS_PAR_ID[e.mouvement]
      expect(m, `${e.id} -> ${e.mouvement}`).toBeDefined()
      expect(e.variante, e.id).toBeDefined()
      expect(m.variantes[e.variante!], e.id).toBe(e.id)
    }
    for (const m of MOUVEMENTS) {
      for (const n of NIVEAUX) {
        const e = EXERCICES_PAR_ID[m.variantes[n]]
        expect(e.mouvement, e.id).toBe(m.id)
        expect(e.variante, e.id).toBe(n)
      }
    }
  })

  it('renseigne les muscles de chaque exercice', () => {
    for (const e of EXERCICES) {
      const p = e.musclesPrincipaux ?? []
      const s = e.musclesSecondaires ?? []
      expect(p.length, e.id).toBeGreaterThanOrEqual(1)
      expect(p.length, e.id).toBeLessThanOrEqual(3)
      expect(s.length, e.id).toBeLessThanOrEqual(4)
      for (const nom of [...p, ...s]) expect(nom, e.id).toMatch(/^\p{Lu}/u)
      for (const nom of p) expect(s, e.id).not.toContain(nom)
    }
  })

  it('couvre toutes les familles de force, le gainage, le cardio et la mobilité', () => {
    const familles: Famille[] = [
      'charniere', 'squat', 'fente', 'tirage', 'poussee', 'porte', 'gainage', 'cardio',
      'mob_epaules', 'mob_hanches', 'mob_thoracique',
    ]
    for (const f of familles) expect(MOUVEMENTS.some((m) => m.famille === f), f).toBe(true)
  })

  it('n’utilise jamais de tiret long', () => {
    expect(JSON.stringify(MOUVEMENTS)).not.toContain('\u2014')
  })
})
