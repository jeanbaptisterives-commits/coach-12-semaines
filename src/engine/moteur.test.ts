import { describe, expect, it } from 'vitest'
import type { EtatExercice, Seance, SerieRealisee } from '../types'
import { ECHELLE, CONTINUE_DEPART, etatCourseInitial, niveauEchelle, progresserCourse, NIVEAU_MAX_PHASE_1 } from './course'
import { lundiDe, phaseDe, semaineDe } from './dates'
import { LIB, PROFIL, parId } from './fixtures'
import { scoreForme } from './forme'
import { genererSeance, type ContexteGeneration } from './generateur'
import { seanceManquee, serieReguliere, typeDuJour } from './planning'
import { appliquerProgression, etatInitial } from './progression'
import { bilanHebdo, comparerTests, liensConsoEnergie, moyenneMobile7 } from './stats'

const s = (reps: number, rpe: number, douleur = false, charge?: number): SerieRealisee => ({ reps, rpe, douleur, charge })
const KBS = PROFIL.kettlebells

describe('double progression', () => {
  const swing = parId('kb_swing')
  const pompes = parId('pompes')
  const planche = parId('planche')

  it('démarre en bas de fourchette, swing un cran au-dessus de la plus légère', () => {
    const e = etatInitial(swing, KBS, 2)
    expect(e.repsCible).toBe(10)
    expect(e.charge).toBe(12)
    expect(etatInitial(parId('kb_goblet_squat'), KBS, 2).charge).toBe(8)
    expect(etatInitial(pompes, KBS, 2).charge).toBeUndefined()
  })

  it('toutes les séries à la cible avec RPE ≤ 8 : +1 rep', () => {
    const e = etatInitial(swing, KBS, 2)
    const r = appliquerProgression(swing, e, [s(10, 7), s(10, 8)], KBS, '2026-10-20')
    expect(r.decision).toBe('monte')
    expect(r.etat.repsCible).toBe(11)
    expect(r.etat.charge).toBe(12)
  })

  it('au haut de la fourchette : kettlebell suivante et retour en bas', () => {
    const e: EtatExercice = { ...etatInitial(swing, KBS, 2), repsCible: 15 }
    const r = appliquerProgression(swing, e, [s(15, 7), s(15, 8)], KBS, 'd')
    expect(r.decision).toBe('monte')
    expect(r.etat.charge).toBe(16)
    expect(r.etat.repsCible).toBe(10)
    expect(r.etat.dernierChangement).toContain('16 kg')
  })

  it('au haut sans kettlebell plus lourde : une série de plus, puis fourchette relevée à 4 séries', () => {
    const e: EtatExercice = { ...etatInitial(swing, KBS, 2), repsCible: 15, charge: 20 }
    const r = appliquerProgression(swing, e, [s(15, 6), s(15, 6)], KBS, 'd')
    expect(r.etat.series).toBe(3)
    expect(r.etat.repsCible).toBe(10)
    const p: EtatExercice = { ...etatInitial(pompes, KBS, 4), repsCible: 12 }
    const r2 = appliquerProgression(pompes, p, [s(12, 7), s(12, 7), s(12, 7), s(12, 8)], KBS, 'd')
    expect(r2.etat.basReps).toBe(8)
    expect(r2.etat.hautReps).toBe(14)
  })

  it('exercice en durée : +5 s', () => {
    const e = etatInitial(planche, KBS, 2)
    const r = appliquerProgression(planche, e, [s(20, 6), s(22, 7)], KBS, 'd')
    expect(r.etat.repsCible).toBe(25)
  })

  it('RPE ≥ 9 avec les reps faites : on maintient, sans échec', () => {
    const e = etatInitial(swing, KBS, 2)
    const r = appliquerProgression(swing, { ...e, echecs: 1 }, [s(10, 9), s(10, 8)], KBS, 'd')
    expect(r.decision).toBe('maintien')
    expect(r.etat.repsCible).toBe(10)
    expect(r.etat.echecs).toBe(0)
  })

  it('reps manquées : maintien, puis baisse au 2e échec de suite', () => {
    const e: EtatExercice = { ...etatInitial(swing, KBS, 2), repsCible: 13 }
    const r1 = appliquerProgression(swing, e, [s(13, 8), s(11, 9)], KBS, 'd')
    expect(r1.decision).toBe('maintien')
    expect(r1.etat.echecs).toBe(1)
    expect(r1.etat.repsCible).toBe(13)
    const r2 = appliquerProgression(swing, r1.etat, [s(12, 9), s(11, 9)], KBS, 'd')
    expect(r2.decision).toBe('baisse')
    expect(r2.etat.repsCible).toBe(11)
    expect(r2.etat.echecs).toBe(0)
  })

  it('baisse en bas de fourchette : kettlebell plus légère', () => {
    const e: EtatExercice = { ...etatInitial(swing, KBS, 2), charge: 16, echecs: 1 }
    const r = appliquerProgression(swing, e, [s(8, 9), s(7, 10)], KBS, 'd')
    expect(r.decision).toBe('baisse')
    expect(r.etat.charge).toBe(12)
    expect(r.etat.repsCible).toBe(15)
  })

  it('une série non faite compte comme un échec', () => {
    const e = etatInitial(swing, KBS, 2)
    const r = appliquerProgression(swing, e, [s(10, 6)], KBS, 'd')
    expect(r.decision).toBe('maintien')
    expect(r.etat.echecs).toBe(1)
  })

  it('douleur : chiffres gardés, drapeau douleur posé', () => {
    const e = etatInitial(pompes, KBS, 2)
    const r = appliquerProgression(pompes, e, [s(6, 6), s(6, 6, true)], KBS, 'd')
    expect(r.decision).toBe('douleur')
    expect(r.etat.douleur).toBe(true)
    expect(r.etat.repsCible).toBe(6)
  })
})

const forme = { score: 7, bas: false, detail: 'forme correcte' }
function ctx(extra: Partial<ContexteGeneration> = {}): ContexteGeneration {
  return {
    type: 'A',
    semaine: 1,
    profil: PROFIL,
    lib: LIB,
    etats: {},
    etatCourse: etatCourseInitial(),
    forme,
    ...extra,
  }
}
const ids = (p: { exerciceId: string }[]) => p.map((x) => x.exerciceId)

describe('génération de séance', () => {
  it('séance A : les 4 exercices de référence + un 5e qui tourne', () => {
    const plan = genererSeance(ctx())
    expect(ids(plan.principal).slice(0, 4)).toEqual(['kb_swing', 'kb_goblet_squat', 'kb_rowing_un_bras', 'pompes'])
    expect(plan.principal).toHaveLength(5)
    expect(plan.echauffement.length).toBe(3)
    expect(plan.retourCalme.length).toBe(2)
    expect(plan.raison).toMatch(/fondation/)
  })

  it('ne propose jamais un exercice dangereux pour les épaules ni à haute intensité', () => {
    for (const type of ['A', 'B', 'C', 'express'] as const) {
      for (let semaine = 1; semaine <= 12; semaine++) {
        const plan = genererSeance(ctx({ type, semaine }))
        for (const p of [...plan.echauffement, ...plan.principal, ...plan.retourCalme]) {
          const e = parId(p.exerciceId)
          expect(e.surEpaules, `${type} S${semaine} ${e.id}`).toBe(true)
          expect(e.intensite).not.toBe('haute')
        }
      }
    }
  })

  it('pas de barre : jamais de tractions ; avec barre, elles peuvent sortir', () => {
    const toutes = (barre: boolean) =>
      Array.from({ length: 12 }, (_, i) =>
        ids(genererSeance(ctx({ type: 'C', semaine: i + 1, profil: { ...PROFIL, barreTraction: barre } })).principal),
      ).flat()
    expect(toutes(false).some((id) => id.startsWith('tractions'))).toBe(false)
    expect(toutes(true).some((id) => id.startsWith('tractions'))).toBe(true)
  })

  it('douleur signalée : la référence est remplacée par son alternative, raison affichée', () => {
    const etats = { pompes: { ...etatInitial(parId('pompes'), KBS, 2), douleur: true } }
    const plan = genererSeance(ctx({ etats }))
    expect(ids(plan.principal)).not.toContain('pompes')
    expect(ids(plan.principal)).toContain('pompes_inclinees')
    expect(plan.raison).toContain('pompes remplacé par pompes_inclinees')
  })

  it('forme basse : volume réduit d’environ 20 % et raison en tête', () => {
    const normal = genererSeance(ctx({ semaine: 6 }))
    const bas = genererSeance(ctx({ semaine: 6, forme: { score: 3.5, bas: true, detail: '5 joints hier' } }))
    expect(bas.allegee).toBe(true)
    expect(bas.raison).toMatch(/^Forme basse ce matin \(5 joints hier\)/)
    const vol = (p: typeof normal) => p.principal.reduce((t, x) => t + x.series * x.reps, 0)
    const ratio = vol(bas) / vol(normal)
    expect(ratio).toBeLessThan(0.9)
    expect(ratio).toBeGreaterThan(0.6)
  })

  it('séance B : course-marche, raison avec la progression de la course', () => {
    const plan = genererSeance(ctx({ type: 'B', messageCourse: 'Course : 7 × (1 min 30 course + 1 min 30 marche)' }))
    expect(plan.course).toBeDefined()
    expect(plan.raison).toContain('Course : 7 ×')
  })

  it('fractionné verrouillé sans feu vert, débloqué avec en phase 2', () => {
    const sans = genererSeance(ctx({ type: 'B', semaine: 6 }))
    expect(sans.course).toBeDefined()
    expect(ids(sans.principal)).not.toContain('fractionne_course')
    const avec = genererSeance(ctx({ type: 'B', semaine: 6, profil: { ...PROFIL, feuVertMedical: true } }))
    expect(ids(avec.principal)).toContain('fractionne_course')
    const phase1 = genererSeance(ctx({ type: 'B', semaine: 2, profil: { ...PROFIL, feuVertMedical: true } }))
    expect(ids(phase1.principal)).not.toContain('fractionne_course')
  })

  it('rotation : la variante change au bloc suivant, les références restent', () => {
    const c1 = genererSeance(ctx({ type: 'C', semaine: 1 }))
    const c4 = genererSeance(ctx({ type: 'C', semaine: 4 }))
    expect(ids(c1.principal)).not.toEqual(ids(c4.principal))
    expect(ids(c1.principal)).toContain('planche')
    expect(ids(c4.principal)).toContain('planche')
    expect(genererSeance(ctx({ type: 'A', semaine: 4 })).raison).toMatch(/Nouveau bloc/)
  })

  it('progression mémorisée : affichée dans la raison suivante', () => {
    const etats = { kb_swing: { ...etatInitial(parId('kb_swing'), KBS, 2), dernierChangement: 'kb_swing : passage à 16 kg' } }
    expect(genererSeance(ctx({ etats })).raison).toContain('passage à 16 kg')
  })

  it('séance C : circuit sans kettlebell + 3 mobilités', () => {
    const plan = genererSeance(ctx({ type: 'C' }))
    const exs = plan.principal.map((p) => parId(p.exerciceId))
    expect(exs.some((e) => e.chargeable)).toBe(false)
    expect(exs.filter((e) => e.famille.startsWith('mob_')).map((e) => e.famille).sort()).toEqual([
      'mob_epaules',
      'mob_hanches',
      'mob_thoracique',
    ])
  })

  it('express : 4 exercices, environ 15 minutes', () => {
    const plan = genererSeance(ctx({ type: 'express' }))
    expect(plan.principal).toHaveLength(4)
    expect(plan.dureeEstimeeMin).toBeLessThanOrEqual(18)
  })

  it('reste sous 30 minutes en phase 3', () => {
    for (const type of ['A', 'C'] as const) expect(genererSeance(ctx({ type, semaine: 11 })).dureeEstimeeMin).toBeLessThanOrEqual(30)
  })
})

describe('course', () => {
  const ok = (rpe: number) => ({ rpe, douleur: false, terminee: true })

  it('facile : on monte d’un cran ; dur : on redescend ; moyen : on garde', () => {
    const e0 = etatCourseInitial()
    const up = progresserCourse(e0, ok(4), 1)
    expect(niveauEchelle(up.etat)).toBe(1)
    expect(progresserCourse(up.etat, ok(7), 1).decision).toBe('maintien')
    expect(niveauEchelle(progresserCourse(up.etat, ok(9), 1).etat)).toBe(0)
    expect(niveauEchelle(progresserCourse(up.etat, { rpe: 5, douleur: false, terminee: false }, 1).etat)).toBe(0)
  })

  it('phase 1 plafonnée, course continue ouverte en phase 2', () => {
    let e = etatCourseInitial()
    for (let i = 0; i < 12; i++) e = progresserCourse(e, ok(4), 1).etat
    expect(niveauEchelle(e)).toBe(NIVEAU_MAX_PHASE_1)
    expect(e.continueMin).toBe(0)
    // niveau 6 → 7 (10 min × 2), puis premier bloc continu
    for (let i = 0; i < 2; i++) e = progresserCourse(e, ok(4), 2).etat
    expect(e.continueMin).toBe(CONTINUE_DEPART)
    e = progresserCourse(e, ok(4), 2).etat
    expect(e.continueMin).toBe(CONTINUE_DEPART + 2)
  })

  it('course continue trop dure : retour au course-marche', () => {
    const e = { ...etatCourseInitial(), ...ECHELLE[ECHELLE.length - 1], continueMin: 15 }
    const r = progresserCourse(e, ok(9), 2)
    expect(r.etat.continueMin).toBe(0)
    expect(niveauEchelle(r.etat)).toBe(ECHELLE.length - 1)
  })
})

describe('forme du matin', () => {
  it('pas de check : pas d’allègement', () => {
    expect(scoreForme(undefined, undefined).bas).toBe(false)
  })
  it('bonne nuit : forme correcte', () => {
    expect(scoreForme({ date: 'd', energie: 7, sommeil: 7 }, { date: 'v', joints: 1 })).toMatchObject({ score: 7, bas: false })
  })
  it('énergie moyenne + grosse conso la veille : forme basse', () => {
    const f = scoreForme({ date: 'd', energie: 6, sommeil: 5, heuresSommeil: 7 }, { date: 'v', joints: 5 })
    expect(f.score).toBe(4)
    expect(f.bas).toBe(true)
    expect(f.detail).toContain('5 joints hier')
  })
})

describe('calendrier et planning', () => {
  it('semaines et phases', () => {
    expect(lundiDe('2026-10-25')).toBe('2026-10-19')
    expect(semaineDe('2026-10-19', '2026-10-18')).toBe(0)
    expect(semaineDe('2026-10-19', '2026-10-25')).toBe(1)
    expect(semaineDe('2026-10-19', '2026-10-26')).toBe(2)
    expect([phaseDe(4), phaseDe(5), phaseDe(9)]).toEqual([1, 2, 3])
  })

  it('mardi A, jeudi B, samedi C, lundi off', () => {
    expect(typeDuJour(PROFIL, '2026-10-20')).toBe('A')
    expect(typeDuJour(PROFIL, '2026-10-22')).toBe('B')
    expect(typeDuJour(PROFIL, '2026-10-24')).toBe('C')
    expect(typeDuJour(PROFIL, '2026-10-19')).toBeNull()
  })

  const seance = (date: string, type: Seance['type'] = 'A'): Seance => ({
    date, type, semaine: 1, phase: 1, zeroJoint: true, raison: '', allegee: false,
    plan: { type, echauffement: [], principal: [], retourCalme: [], raison: '', allegee: false, dureeEstimeeMin: 0 },
    exercices: [], dureeSec: 0, terminee: true,
  })

  it('séance de mardi sautée : express proposée mercredi, plus après rattrapage', () => {
    expect(seanceManquee(PROFIL, [], '2026-10-21')).toBe('2026-10-20')
    expect(seanceManquee(PROFIL, [seance('2026-10-20')], '2026-10-21')).toBeNull()
    expect(seanceManquee(PROFIL, [seance('2026-10-21', 'express')], '2026-10-21')).toBeNull()
  })

  it('série de régularité, express qui rattrape', () => {
    const faites = [seance('2026-10-20'), seance('2026-10-23', 'express'), seance('2026-10-24', 'C')]
    expect(serieReguliere(PROFIL, faites, '2026-10-24')).toBe(3)
    expect(serieReguliere(PROFIL, [seance('2026-10-20')], '2026-10-24')).toBe(0)
    expect(serieReguliere(PROFIL, [seance('2026-10-20'), seance('2026-10-22')], '2026-10-24')).toBe(2)
  })
})

describe('stats', () => {
  it('moyenne mobile 7 jours', () => {
    const m = moyenneMobile7([
      { date: '2026-10-01', kg: 82 },
      { date: '2026-10-04', kg: 81 },
      { date: '2026-10-09', kg: 80 },
    ])
    expect(m.map((x) => x.moyenne7)).toEqual([82, 81.5, 80.5])
  })

  it('comparaison de tests', () => {
    const c = comparerTests(
      { semaine: 0, date: 'a', pompesMax: 15, tempsCourseSec: 900, distanceKm: 2, poids: 82 },
      { semaine: 4, date: 'b', pompesMax: 19, tempsCourseSec: 840, distanceKm: 2, poids: 81 },
    )
    expect(c.every((x) => x.mieux === true)).toBe(true)
    expect(c[1].texte).toBe('15:00 → 14:00')
  })

  it('liens conso / énergie', () => {
    const l = liensConsoEnergie([
      { date: '2026-10-01', joints: 1 },
      { date: '2026-10-02', energie: 7, sommeil: 8, jointMatin: false, joints: 5 },
      { date: '2026-10-03', energie: 4, sommeil: 5, jointMatin: true },
    ])
    expect(l.energieSansJointMatin).toBe(7)
    expect(l.energieAvecJointMatin).toBe(4)
    expect(l.energieApresVeilleLegere).toBe(7)
    expect(l.energieApresVeilleChargee).toBe(4)
  })

  it('bilan hebdo : victoire et point à travailler', () => {
    const b = bilanHebdo(PROFIL, [], [{ date: '2026-10-20', joints: 4, mode: 'joint_tabac' }], '2026-10-25')
    expect(b.prevues).toBe(3)
    expect(b.faites).toBe(0)
    expect(b.aTravailler).toMatch(/3 séances sautées/)
    expect(b.partSansTabac).toBe(0)
  })
})
