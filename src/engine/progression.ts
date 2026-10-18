import type { EtatExercice, Exercice, SerieRealisee } from '../types'

export type Decision = 'monte' | 'maintien' | 'baisse' | 'douleur'

export interface ResultatProgression {
  etat: EtatExercice
  decision: Decision
  message: string
}

export const RPE_MAX_PROGRESSION = 8
export const SERIES_MAX = 4

function pas(ex: Exercice): number {
  return ex.mesure === 'duree' ? 5 : 1
}

function unite(ex: Exercice): string {
  return ex.mesure === 'duree' ? ' s' : ' reps'
}

export function kettlebellSuivante(kbs: number[], charge: number): number | undefined {
  return [...kbs].sort((a, b) => a - b).find((k) => k > charge)
}

export function kettlebellPrecedente(kbs: number[], charge: number): number | undefined {
  return [...kbs].sort((a, b) => b - a).find((k) => k < charge)
}

// Charge de départ selon la famille : on reprend léger, le swing un cran au-dessus.
export function chargeInitiale(ex: Exercice, kbs: number[]): number | undefined {
  if (!ex.chargeable || kbs.length === 0) return undefined
  const tri = [...kbs].sort((a, b) => a - b)
  if (ex.famille === 'charniere' && tri.length >= 3) return tri[1]
  return tri[0]
}

export function etatInitial(ex: Exercice, kbs: number[], series: number): EtatExercice {
  const [bas, haut] = ex.fourchette ?? (ex.mesure === 'duree' ? [20, 40] : [8, 12])
  return {
    exerciceId: ex.id,
    basReps: bas,
    hautReps: haut,
    repsCible: bas,
    charge: chargeInitiale(ex, kbs),
    series,
    echecs: 0,
    douleur: false,
  }
}

// Double progression, appliquée à la fin de chaque séance pour chaque exercice fait.
// - Toutes les séries à la cible avec RPE ≤ 8 : +1 rep (ou +5 s) jusqu'au haut de la fourchette,
//   puis au haut : kettlebell suivante (retour en bas de fourchette), sinon série en plus, sinon fourchette relevée.
// - RPE ≥ 9 avec les reps faites : on maintient, sans compter d'échec.
// - Reps manquées : échec. Deux échecs d'affilée : on baisse légèrement.
// - Douleur : on garde les chiffres, l'exercice est remplacé la fois suivante.
export function appliquerProgression(
  ex: Exercice,
  etat: EtatExercice,
  series: SerieRealisee[],
  kbs: number[],
  date: string,
): ResultatProgression {
  const base: EtatExercice = { ...etat, derniereFois: date, dernierChangement: undefined }
  if (series.length === 0) return { etat: base, decision: 'maintien', message: '' }

  if (series.some((s) => s.douleur)) {
    return {
      etat: { ...base, douleur: true },
      decision: 'douleur',
      message: `${ex.nom} : douleur signalée, remplacé la prochaine fois`,
    }
  }
  base.douleur = false

  const toutesFaites = series.length >= etat.series && series.every((s) => s.reps >= etat.repsCible)
  const rpeMax = Math.max(...series.map((s) => s.rpe))

  if (toutesFaites && rpeMax <= RPE_MAX_PROGRESSION) {
    base.echecs = 0
    if (etat.repsCible < etat.hautReps) {
      base.repsCible = Math.min(etat.hautReps, etat.repsCible + pas(ex))
      base.dernierChangement = `${ex.nom} : ${base.repsCible}${unite(ex)} par série`
      return { etat: base, decision: 'monte', message: base.dernierChangement }
    }
    const suivante = etat.charge != null ? kettlebellSuivante(kbs, etat.charge) : undefined
    if (ex.chargeable && suivante != null) {
      base.charge = suivante
      base.repsCible = etat.basReps
      base.dernierChangement = `${ex.nom} : passage à ${suivante} kg`
    } else if (etat.series < SERIES_MAX) {
      base.series = etat.series + 1
      base.repsCible = etat.basReps
      base.dernierChangement = `${ex.nom} : une série de plus`
    } else if (ex.mouvement && ex.variante !== 'difficile') {
      // Haut de fourchette, séries au maximum, plus de charge possible : la variante est maîtrisée.
      base.maitrise = true
      base.dernierChangement = `${ex.nom} maîtrisé : on passe à la variante plus difficile`
    } else {
      const decal = ex.mesure === 'duree' ? 10 : 2
      base.basReps = etat.basReps + decal
      base.hautReps = etat.hautReps + decal
      base.repsCible = base.basReps
      base.dernierChangement = `${ex.nom} : fourchette relevée à ${base.basReps}-${base.hautReps}${unite(ex)}`
    }
    return { etat: base, decision: 'monte', message: base.dernierChangement }
  }

  if (toutesFaites) {
    // Reps faites mais RPE ≥ 9 : trop dur pour monter, pas un échec.
    base.echecs = 0
    return { etat: base, decision: 'maintien', message: `${ex.nom} : on garde la même cible` }
  }

  base.echecs = etat.echecs + 1
  if (base.echecs < 2) {
    return { etat: base, decision: 'maintien', message: `${ex.nom} : cible manquée, on réessaie` }
  }

  base.echecs = 0
  if (etat.repsCible > etat.basReps) {
    base.repsCible = Math.max(etat.basReps, etat.repsCible - 2 * pas(ex))
    base.dernierChangement = `${ex.nom} : on redescend à ${base.repsCible}${unite(ex)}`
  } else {
    const precedente = etat.charge != null ? kettlebellPrecedente(kbs, etat.charge) : undefined
    if (ex.chargeable && precedente != null) {
      base.charge = precedente
      base.repsCible = etat.hautReps
      base.dernierChangement = `${ex.nom} : retour à ${precedente} kg`
    } else if (etat.series > 2) {
      base.series = etat.series - 1
      base.dernierChangement = `${ex.nom} : une série de moins`
    } else {
      base.repsCible = Math.max(1, etat.repsCible - pas(ex))
      base.basReps = Math.min(base.basReps, base.repsCible)
      base.dernierChangement = `${ex.nom} : on redescend à ${base.repsCible}${unite(ex)}`
    }
  }
  return { etat: base, decision: 'baisse', message: base.dernierChangement ?? '' }
}
