import type { JournalJour, Seance } from '../types'

// Petites victoires : records, paliers de régularité et de conso. Les plus récentes d'abord.
export interface Victoire {
  date: string
  texte: string
}

const PALIERS_SERIE = [3, 6, 9, 12, 18, 24, 30, 36]

export function victoires(seances: Seance[], journal: JournalJour[], serie: number): Victoire[] {
  const res: Victoire[] = []
  const faites = seances.filter((s) => s.terminee).sort((a, b) => a.date.localeCompare(b.date))

  // Records de reps sur une série (pompes) et de charge (kettlebells).
  let meilleuresPompes = 0
  const chargeMax: Record<string, number> = {}
  for (const s of faites) {
    for (const e of s.exercices) {
      if (e.exerciceId === 'pompes') {
        const m = Math.max(0, ...e.series.map((x) => x.reps))
        if (m > meilleuresPompes && meilleuresPompes > 0) res.push({ date: s.date, texte: `Record pompes : ${m} d’affilée` })
        meilleuresPompes = Math.max(meilleuresPompes, m)
      }
      for (const x of e.series) {
        if (x.charge == null || x.douleur) continue
        const avant = chargeMax[e.exerciceId]
        if (avant != null && x.charge > avant) res.push({ date: s.date, texte: `Nouvelle charge : ${x.charge} kg (${e.exerciceId.replace(/^kb_/, '').replace(/_/g, ' ')})` })
        chargeMax[e.exerciceId] = Math.max(avant ?? 0, x.charge)
      }
    }
  }

  const derniere = faites.at(-1)?.date
  if (derniere && PALIERS_SERIE.includes(serie)) res.push({ date: derniere, texte: `${serie} séances d’affilée` })

  // Paliers de conso : premier jour sans tabac, premier jour sans joint le matin, premier jour à zéro.
  const tri = [...journal].sort((a, b) => a.date.localeCompare(b.date))
  const premier = (f: (j: JournalJour) => boolean) => tri.find(f)
  const sansTabac = premier((j) => (j.joints ?? 0) > 0 && j.mode != null && j.mode !== 'joint_tabac')
  if (sansTabac) res.push({ date: sansTabac.date, texte: 'Premier jour de conso sans tabac' })
  const vapo = premier((j) => j.mode === 'vaporisateur')
  if (vapo) res.push({ date: vapo.date, texte: 'Premier jour au vaporisateur' })
  const matinLibre = premier((j) => j.jointMatin === false)
  if (matinLibre) res.push({ date: matinLibre.date, texte: 'Premier matin sans joint' })
  const zero = premier((j) => j.joints === 0)
  if (zero) res.push({ date: zero.date, texte: 'Premier jour à zéro joint' })
  const zeroAvantSeance = faites.filter((s) => s.zeroJoint).length
  if ([1, 5, 10, 20, 30].includes(zeroAvantSeance)) {
    const s = faites.filter((x) => x.zeroJoint)[zeroAvantSeance - 1]
    res.push({ date: s.date, texte: `${zeroAvantSeance} séance${zeroAvantSeance > 1 ? 's' : ''} sans joint avant` })
  }

  return res.sort((a, b) => b.date.localeCompare(a.date))
}
