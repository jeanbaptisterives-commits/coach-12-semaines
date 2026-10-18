import { describe, expect, it } from 'vitest'
import { EXERCICES, EXERCICES_PAR_ID } from '../data/exercices'
import { etatCourseInitial } from './course'
import { PROFIL } from './fixtures'
import { genererSeance } from './generateur'

// Les règles de sécurité, vérifiées sur la vraie bibliothèque, toutes semaines et tous profils confondus.
describe('génération avec la vraie bibliothèque', () => {
  const forme = { score: 7, bas: false, detail: '' }
  const profils = [
    PROFIL,
    { ...PROFIL, barreTraction: true },
    { ...PROFIL, feuVertMedical: true },
    { ...PROFIL, kettlebells: [12] },
  ]
  it('jamais d’exercice dangereux pour les épaules, jamais de haute intensité dans A, C et express', () => {
    for (const profil of profils)
      for (const type of ['A', 'B', 'C', 'express'] as const)
        for (let semaine = 1; semaine <= 12; semaine++) {
          const p = genererSeance({ type, semaine, profil, lib: EXERCICES, etats: {}, etatCourse: etatCourseInitial(), forme })
          for (const x of [...p.echauffement, ...p.principal, ...p.retourCalme]) {
            const e = EXERCICES_PAR_ID[x.exerciceId]
            expect(e, x.exerciceId).toBeDefined()
            expect(e.surEpaules, `${type} S${semaine} ${e.id}`).toBe(true)
            if (type !== 'B') expect(e.intensite, `${type} S${semaine} ${e.id}`).not.toBe('haute')
            if (!profil.barreTraction) expect(e.materiel).not.toContain('barre')
          }
          if (type === 'A') expect(p.principal.length).toBe(5)
          if (type === 'C') expect(p.principal.length).toBe(8)
          expect(p.dureeEstimeeMin, `${type} S${semaine}`).toBeLessThanOrEqual(32)
        }
  })
})
