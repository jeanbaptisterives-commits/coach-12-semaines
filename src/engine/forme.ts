import type { JournalJour } from '../types'

export interface ScoreForme {
  score: number | null // /10, null si le check du matin n'est pas fait
  bas: boolean
  detail: string
}

export const SEUIL_FORME_BASSE = 5

// Score du matin : énergie et sommeil du jour, corrigés par la nuit courte et la conso de la veille.
export function scoreForme(aujourdhui: JournalJour | undefined, veille: JournalJour | undefined): ScoreForme {
  if (!aujourdhui || aujourdhui.energie == null || aujourdhui.sommeil == null) {
    return { score: null, bas: false, detail: 'check du matin non fait' }
  }
  let score = (aujourdhui.energie + aujourdhui.sommeil) / 2
  const raisons: string[] = []
  if (aujourdhui.heuresSommeil != null && aujourdhui.heuresSommeil < 6) {
    score -= 1
    raisons.push('nuit courte')
  }
  const joints = veille?.joints ?? 0
  if (joints >= 5) {
    score -= 1.5
    raisons.push(`${joints} joints hier`)
  } else if (joints >= 3) {
    score -= 1
    raisons.push(`${joints} joints hier`)
  }
  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10))
  const bas = score < SEUIL_FORME_BASSE
  const detail = raisons.length ? raisons.join(', ') : bas ? 'énergie et sommeil bas' : 'forme correcte'
  return { score, bas, detail }
}
