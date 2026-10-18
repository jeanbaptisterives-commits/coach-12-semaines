import type {
  EtatCourse,
  EtatExercice,
  Exercice,
  Famille,
  Materiel,
  MotCoach,
  PrescriptionExercice,
  Profil,
  SeancePlanifiee,
  TypeSeance,
} from '../types'
import { allegerCourse, dureeCourseMin } from './course'
import { phaseDe } from './dates'
import type { ScoreForme } from './forme'
import { etatInitial } from './progression'

export interface ContexteGeneration {
  type: TypeSeance
  semaine: number
  profil: Profil
  lib: Exercice[]
  etats: Record<string, EtatExercice>
  etatCourse: EtatCourse
  forme: ScoreForme
  messageCourse?: string // dernier changement de la course, pour la raison du jour
  numeroSeance?: number // compteur de séances, fait tourner échauffements et retours au calme
  coach?: MotCoach // consignes du jour écrites par Claude (déjà filtrées sur la date)
}

interface Emplacement {
  famille: Famille
  reference?: string
  sansCharge?: boolean // circuit poids du corps
}

const SEANCE_A: Emplacement[] = [
  { famille: 'charniere', reference: 'kb_swing' },
  { famille: 'squat', reference: 'kb_goblet_squat' },
  { famille: 'tirage', reference: 'kb_rowing_un_bras' },
  { famille: 'poussee', reference: 'pompes' },
]

const SEANCE_C: Emplacement[] = [
  { famille: 'fente', sansCharge: true },
  { famille: 'poussee', sansCharge: true },
  { famille: 'tirage', sansCharge: true },
  { famille: 'charniere', sansCharge: true },
  { famille: 'gainage', reference: 'planche' },
]

const MOBILITE: Famille[] = ['mob_epaules', 'mob_hanches', 'mob_thoracique']

const SEANCE_EXPRESS: Emplacement[] = [
  { famille: 'charniere', reference: 'kb_swing' },
  { famille: 'squat', reference: 'kb_goblet_squat' },
  { famille: 'poussee', reference: 'pompes' },
  { famille: 'gainage', reference: 'planche' },
]

export function seriesParPhase(type: TypeSeance, phase: 1 | 2 | 3): number {
  if (type === 'express') return 2
  if (type === 'C') return phase === 1 ? 2 : 3
  return phase === 1 ? 2 : 3
}

function niveauMax(phase: 1 | 2 | 3): number {
  return phase === 3 ? 3 : 2
}

export function materielDisponible(profil: Profil, type: TypeSeance): Materiel[] {
  const m: Materiel[] = ['poids_du_corps', 'tapis', 'table', 'chienne']
  if (type !== 'C') m.push('kettlebell')
  if (profil.barreTraction) m.push('barre')
  return m
}

// Règle de sécurité absolue : jamais proposé automatiquement si pas sûr pour les épaules,
// ni à haute intensité sans feu vert médical.
export function estAutorise(ex: Exercice, profil: Profil): boolean {
  if (!ex.surEpaules) return false
  if (ex.intensite === 'haute' && !profil.feuVertMedical) return false
  if (ex.materiel.includes('barre') && !profil.barreTraction) return false
  if (ex.chargeable && profil.kettlebells.length === 0) return false
  return true
}

function candidats(
  ctx: ContexteGeneration,
  famille: Famille,
  dejaPris: Set<string>,
  opts: { sansCharge?: boolean; avecReference?: boolean } = {},
): Exercice[] {
  const phase = phaseDe(ctx.semaine)
  const dispo = materielDisponible(ctx.profil, ctx.type)
  return ctx.lib
    .filter(
      (e) =>
        e.famille === famille &&
        estAutorise(e, ctx.profil) &&
        e.intensite !== 'haute' &&
        e.niveau <= niveauMax(phase) &&
        e.materiel.every((m) => dispo.includes(m)) &&
        !(opts.sansCharge && e.chargeable) &&
        (opts.avecReference || !e.reference) &&
        !ctx.etats[e.id]?.douleur &&
        !dejaPris.has(e.id),
    )
    .sort((a, b) => a.niveau - b.niveau || a.id.localeCompare(b.id))
}

// Rotation : la variante change toutes les 3 semaines (bloc), les exercices de référence restent.
export function blocRotation(semaine: number): number {
  return Math.floor(Math.max(0, semaine - 1) / 3)
}

function choisirVariante(liste: Exercice[], decalage: number): Exercice | undefined {
  if (liste.length === 0) return undefined
  return liste[decalage % liste.length]
}

interface Choix {
  ex: Exercice
  remplace?: Exercice
}

function choisir(ctx: ContexteGeneration, emp: Emplacement, dejaPris: Set<string>, idx: number): Choix | undefined {
  const parId = (id: string) => ctx.lib.find((e) => e.id === id)
  if (emp.reference) {
    const ref = parId(emp.reference)
    if (ref && estAutorise(ref, ctx.profil) && !ctx.etats[ref.id]?.douleur) return { ex: ref }
    if (ref && ctx.etats[ref.id]?.douleur) {
      const alt = (ref.alternatives ?? [])
        .map(parId)
        .find((a): a is Exercice => !!a && estAutorise(a, ctx.profil) && !ctx.etats[a.id]?.douleur && !dejaPris.has(a.id))
      const ex = alt ?? candidats(ctx, emp.famille, dejaPris)[0]
      return ex ? { ex, remplace: ref } : undefined
    }
  }
  const liste = candidats(ctx, emp.famille, dejaPris, { sansCharge: emp.sansCharge })
  const ex = choisirVariante(liste, blocRotation(ctx.semaine) + idx)
  return ex ? { ex } : undefined
}

// Consigne du coach : remplacer un exercice par un autre, seulement si le remplaçant est autorisé.
function remplacementCoach(ctx: ContexteGeneration, c: Choix | undefined, dejaPris: Set<string>): Choix | undefined {
  if (!c) return c
  // Le coach peut viser l'exercice prévu, ou celui que l'app a déjà écarté après une douleur.
  const r = ctx.coach?.seance?.remplacer?.find((x) => x.de === c.ex.id || x.de === c.remplace?.id)
  const par = r && ctx.lib.find((e) => e.id === r.par)
  if (!par || !estAutorise(par, ctx.profil) || par.intensite === 'haute' || dejaPris.has(par.id) || ctx.etats[par.id]?.douleur) return c
  return { ex: par, remplace: c.remplace }
}

function prescrire(ctx: ContexteGeneration, ex: Exercice, seriesDefaut: number, reposSec: number): PrescriptionExercice {
  const etat = ctx.etats[ex.id] ?? etatInitial(ex, ctx.profil.kettlebells, seriesDefaut)
  return {
    exerciceId: ex.id,
    series: Math.max(etat.series, seriesDefaut),
    reps: etat.repsCible,
    charge: ex.chargeable ? etat.charge : undefined,
    reposSec,
  }
}

function simple(ex: Exercice): PrescriptionExercice {
  const [bas] = ex.fourchette ?? (ex.mesure === 'duree' ? [30, 45] : [8, 10])
  return { exerciceId: ex.id, series: 1, reps: bas, reposSec: 0 }
}

function tourner(ctx: ContexteGeneration, famille: Famille, n: number, decalage: number): Exercice[] {
  const liste = ctx.lib.filter((e) => e.famille === famille && estAutorise(e, ctx.profil) && e.intensite !== 'haute')
  if (liste.length === 0) return []
  const tri = [...liste].sort((a, b) => a.id.localeCompare(b.id))
  return Array.from({ length: Math.min(n, tri.length) }, (_, i) => tri[(decalage + i) % tri.length])
}

export function alleger(p: PrescriptionExercice): PrescriptionExercice {
  if (p.series >= 3) return { ...p, series: p.series - 1 }
  return { ...p, reps: Math.max(1, Math.round(p.reps * 0.8)) }
}

export function dureeEstimee(plan: Omit<SeancePlanifiee, 'dureeEstimeeMin'>, lib: Exercice[]): number {
  const parId = (id: string) => lib.find((e) => e.id === id)
  const sec = (p: PrescriptionExercice) => {
    const ex = parId(p.exerciceId)
    const effort = ex?.mesure === 'duree' ? p.reps : p.reps * 3 * (ex?.unilateral ? 2 : 1)
    return p.series * effort + (p.series - 1) * p.reposSec + 20
  }
  const total =
    [...plan.echauffement, ...plan.principal, ...plan.retourCalme].reduce((s, p) => s + sec(p), 0) / 60 +
    (plan.course ? dureeCourseMin(plan.course) : 0)
  return Math.round(total)
}

export function genererSeance(ctx: ContexteGeneration): SeancePlanifiee {
  const phase = phaseDe(ctx.semaine)
  const seriesDefaut = seriesParPhase(ctx.type, phase)
  const tour = (ctx.numeroSeance ?? ctx.semaine * 3) % 7
  const dejaPris = new Set<string>()
  const remplacements: string[] = []
  const principal: PrescriptionExercice[] = []
  let course: EtatCourse | undefined
  const raisons: string[] = []

  const ajouter = (emps: Emplacement[], repos: number) => {
    emps.forEach((emp, i) => {
      const c = remplacementCoach(ctx, choisir(ctx, emp, dejaPris, i), dejaPris)
      if (!c) return
      dejaPris.add(c.ex.id)
      if (c.remplace) remplacements.push(`${c.remplace.nom} remplacé par ${c.ex.nom} après la douleur signalée`)
      principal.push(prescrire(ctx, c.ex, seriesDefaut, repos))
    })
  }

  if (ctx.type === 'A') {
    ajouter(SEANCE_A, 75)
    // 5e exercice qui tourne : un porté une semaine sur deux, une fente l'autre.
    ajouter([{ famille: ctx.semaine % 2 === 0 ? 'fente' : 'porte' }], 60)
  } else if (ctx.type === 'C') {
    ajouter(SEANCE_C, 30)
    MOBILITE.forEach((f) => {
      const ex = choisirVariante(candidats(ctx, f, dejaPris), blocRotation(ctx.semaine) + tour)
      if (ex) {
        dejaPris.add(ex.id)
        principal.push(simple(ex))
      }
    })
  } else if (ctx.type === 'express') {
    ajouter(SEANCE_EXPRESS, 30)
  } else {
    const fractionne = ctx.lib.find((e) => e.id === 'fractionne_course')
    if (ctx.profil.feuVertMedical && phase >= 2 && ctx.semaine % 2 === 0 && fractionne) {
      principal.push({ exerciceId: fractionne.id, series: 6, reps: 30, reposSec: 90, note: '30 s vite, 90 s de marche' })
      raisons.push('Feu vert médical : séance de fractionné une semaine sur deux')
    } else {
      course = ctx.etatCourse
    }
  }

  const nEchauffement = ctx.type === 'express' ? 2 : 3
  const echauffement = tourner(ctx, 'echauffement', nEchauffement, tour).map(simple)
  const retourCalme = tourner(ctx, 'retour_calme', ctx.type === 'express' ? 1 : 2, tour).map(simple)

  let principalFinal = principal
  const consigne = ctx.coach?.seance
  const allegee = ctx.forme.bas || !!consigne?.alleger
  if (allegee) {
    principalFinal = principal.map(alleger)
    if (course) course = allegerCourse(course)
  } else if (consigne?.durcir) {
    principalFinal = principal.map((p) => (p.series > 1 ? { ...p, series: Math.min(4, p.series + 1) } : p))
  }

  if (ctx.forme.bas) raisons.unshift(`Forme basse ce matin (${ctx.forme.detail}) : séance allégée d'environ 20 %`)
  if (consigne && (consigne.alleger || consigne.durcir || consigne.remplacer?.length))
    raisons.unshift(`Coach : ${ctx.coach?.raison ?? (consigne.alleger ? 'séance allégée' : consigne.durcir ? 'une série de plus' : 'exercice changé')}`)
  raisons.push(...remplacements)
  if (raisons.length < 2) {
    const changements = principal
      .map((p) => ctx.etats[p.exerciceId]?.dernierChangement)
      .filter((m): m is string => !!m)
    if (ctx.type === 'B' && ctx.messageCourse) changements.unshift(ctx.messageCourse)
    if (changements.length) raisons.push(`Progression après ta dernière séance : ${changements.slice(0, 2).join(', ')}`)
  }
  if (raisons.length === 0 && ctx.semaine > 1 && (ctx.semaine - 1) % 3 === 0 && ctx.type !== 'B') {
    raisons.push('Nouveau bloc de 3 semaines : variantes renouvelées, exercices de référence inchangés')
  }
  if (raisons.length === 0) raisons.push(raisonParDefaut(ctx.type, phase))

  const raison = raisons
    .slice(0, 2)
    .map((r) => r.trim().replace(/\.$/, ''))
    .map((r) => r.charAt(0).toUpperCase() + r.slice(1))
    .join('. ') + '.'
  const plan = { type: ctx.type, echauffement, principal: principalFinal, retourCalme, course, raison, allegee }
  return { ...plan, dureeEstimeeMin: dureeEstimee(plan, ctx.lib) }
}

export function raisonParDefaut(type: TypeSeance, phase: 1 | 2 | 3): string {
  if (type === 'express') return 'Séance manquée : 15 minutes valent mieux que rien'
  if (phase === 1) return 'Phase fondation : volume léger, on soigne la technique et la régularité'
  if (phase === 2) return 'Phase montée : charges et course continue progressent séance après séance'
  return 'Phase performance : on vise les tests de la semaine 12'
}
