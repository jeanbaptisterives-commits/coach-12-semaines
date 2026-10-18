import type { CourseRealisee, EtatCourse } from '../types'

// Échelle course-marche : environ 20 minutes de travail, la course prend peu à peu toute la place.
export const ECHELLE: Array<Pick<EtatCourse, 'courseSec' | 'marcheSec' | 'blocs'>> = [
  { courseSec: 60, marcheSec: 90, blocs: 8 },
  { courseSec: 90, marcheSec: 90, blocs: 7 },
  { courseSec: 120, marcheSec: 90, blocs: 6 },
  { courseSec: 180, marcheSec: 90, blocs: 5 },
  { courseSec: 240, marcheSec: 60, blocs: 4 },
  { courseSec: 300, marcheSec: 60, blocs: 4 },
  { courseSec: 420, marcheSec: 60, blocs: 3 },
  { courseSec: 600, marcheSec: 60, blocs: 2 },
]
export const CONTINUE_DEPART = 15
export const CONTINUE_MAX = 25 // la séance dure 30 min maximum, échauffement et retour au calme compris
export const NIVEAU_MAX_PHASE_1 = 6 // la course continue s'ouvre en phase 2

export function etatCourseInitial(): EtatCourse {
  return { id: 'course', ...ECHELLE[0], continueMin: 0 }
}

export function niveauEchelle(etat: EtatCourse): number {
  const i = ECHELLE.findIndex((e) => e.courseSec === etat.courseSec && e.marcheSec === etat.marcheSec)
  return i === -1 ? 0 : i
}

function depuisNiveau(i: number): EtatCourse {
  return { id: 'course', ...ECHELLE[Math.max(0, Math.min(ECHELLE.length - 1, i))], continueMin: 0 }
}

export interface ResultatCourse {
  etat: EtatCourse
  decision: 'monte' | 'maintien' | 'baisse'
  message: string
}

// RPE ≤ 5 (on pouvait parler en courant) : on monte d'un cran. 6-7 : on garde. 8 et plus, douleur
// ou séance pas finie : on redescend d'un cran.
export function progresserCourse(etat: EtatCourse, r: CourseRealisee, phase: 1 | 2 | 3): ResultatCourse {
  const facile = r.terminee && !r.douleur && r.rpe <= 5
  const dur = !r.terminee || r.douleur || r.rpe >= 8

  if (etat.continueMin > 0) {
    if (facile && etat.continueMin < CONTINUE_MAX) {
      const m = Math.min(CONTINUE_MAX, etat.continueMin + 2)
      return { etat: { ...etat, continueMin: m }, decision: 'monte', message: `Course : ${m} min en continu` }
    }
    if (dur) {
      const m = etat.continueMin - 2
      if (m < CONTINUE_DEPART) {
        return { etat: depuisNiveau(ECHELLE.length - 1), decision: 'baisse', message: 'Course : retour au course-marche' }
      }
      return { etat: { ...etat, continueMin: m }, decision: 'baisse', message: `Course : ${m} min en continu` }
    }
    return { etat, decision: 'maintien', message: '' }
  }

  const n = niveauEchelle(etat)
  if (facile) {
    const max = phase === 1 ? NIVEAU_MAX_PHASE_1 : ECHELLE.length - 1
    if (n < max) {
      const e = depuisNiveau(n + 1)
      return { etat: e, decision: 'monte', message: `Course : ${libelleBloc(e)}` }
    }
    if (phase >= 2 && n === ECHELLE.length - 1) {
      return {
        etat: { ...etat, continueMin: CONTINUE_DEPART },
        decision: 'monte',
        message: `Course : premier ${CONTINUE_DEPART} min en continu`,
      }
    }
    return { etat, decision: 'maintien', message: '' }
  }
  if (dur && n > 0) {
    const e = depuisNiveau(n - 1)
    return { etat: e, decision: 'baisse', message: `Course : ${libelleBloc(e)}` }
  }
  return { etat, decision: 'maintien', message: '' }
}

function mmss(s: number): string {
  return s % 60 === 0 ? `${s / 60} min` : `${Math.floor(s / 60)} min ${s % 60}`
}

export function libelleBloc(e: EtatCourse): string {
  if (e.continueMin > 0) return `${e.continueMin} min de course continue`
  return `${e.blocs} × (${mmss(e.courseSec)} course + ${mmss(e.marcheSec)} marche)`
}

export function dureeCourseMin(e: EtatCourse): number {
  if (e.continueMin > 0) return e.continueMin
  return Math.round((e.blocs * (e.courseSec + e.marcheSec)) / 60)
}

// Version allégée (forme basse) : environ 20 % de volume en moins.
export function allegerCourse(e: EtatCourse): EtatCourse {
  if (e.continueMin > 0) return { ...e, continueMin: Math.max(10, Math.round(e.continueMin * 0.8)) }
  return { ...e, blocs: Math.max(2, Math.round(e.blocs * 0.8)) }
}
