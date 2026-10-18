import type { JournalJour, Pesee, Profil, Seance, Test } from '../types'
import { ajouterJours, lundiDe } from './dates'
import { joursPrevus } from './planning'

export function moyenne(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null
  return Math.round((valeurs.reduce((a, b) => a + b, 0) / valeurs.length) * 10) / 10
}

// Moyenne mobile sur 7 jours calendaires (les pesées des 7 derniers jours, jour compris).
export function moyenneMobile7(pesees: Pesee[]): Array<Pesee & { moyenne7: number }> {
  const tri = [...pesees].sort((a, b) => a.date.localeCompare(b.date))
  return tri.map((p) => {
    const debut = ajouterJours(p.date, -6)
    const fenetre = tri.filter((q) => q.date >= debut && q.date <= p.date).map((q) => q.kg)
    return { ...p, moyenne7: moyenne(fenetre) ?? p.kg }
  })
}

export interface Comparaison {
  libelle: string
  avant?: number
  apres?: number
  mieux: boolean | null
  texte: string
}

function fmtTemps(s?: number): string {
  if (s == null) return '?'
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
}

export function comparerTests(avant: Test | undefined, apres: Test): Comparaison[] {
  const res: Comparaison[] = []
  const cmp = (libelle: string, a: number | undefined, b: number | undefined, plusHautMieux: boolean, fmt: (v?: number) => string) => {
    if (b == null) return
    const mieux = a == null ? null : b === a ? null : plusHautMieux ? b > a : b < a
    const texte = a == null ? fmt(b) : `${fmt(a)} → ${fmt(b)}`
    res.push({ libelle, avant: a, apres: b, mieux, texte })
  }
  cmp('Pompes max', avant?.pompesMax, apres.pompesMax, true, (v) => String(v ?? '?'))
  if (!avant || avant.distanceKm === apres.distanceKm) {
    cmp(`Course ${apres.distanceKm} km`, avant?.tempsCourseSec, apres.tempsCourseSec, false, fmtTemps)
  } else {
    cmp(`Course ${apres.distanceKm} km`, undefined, apres.tempsCourseSec, false, fmtTemps)
  }
  cmp('Énergie au réveil', avant?.energieMoyenne, apres.energieMoyenne, true, (v) => (v == null ? '?' : `${v}/10`))
  cmp('Poids', avant?.poids, apres.poids, false, (v) => (v == null ? '?' : `${v} kg`))
  return res
}

// Énergie au réveil selon la conso : jours avec ou sans joint le matin, et selon la veille.
export interface Liens {
  energieAvecJointMatin: number | null
  energieSansJointMatin: number | null
  energieApresVeilleLegere: number | null // ≤ 2 joints la veille
  energieApresVeilleChargee: number | null // ≥ 4 joints la veille
  sommeilApresVeilleLegere: number | null
  sommeilApresVeilleChargee: number | null
}

export function liensConsoEnergie(journal: JournalJour[]): Liens {
  const parDate = new Map(journal.map((j) => [j.date, j]))
  const avec: number[] = []
  const sans: number[] = []
  const legere: number[] = []
  const chargee: number[] = []
  const sLegere: number[] = []
  const sChargee: number[] = []
  for (const j of journal) {
    if (j.energie != null && j.jointMatin != null) (j.jointMatin ? avec : sans).push(j.energie)
    const veille = parDate.get(ajouterJours(j.date, -1))
    if (veille?.joints != null) {
      if (veille.joints <= 2) {
        if (j.energie != null) legere.push(j.energie)
        if (j.sommeil != null) sLegere.push(j.sommeil)
      } else if (veille.joints >= 4) {
        if (j.energie != null) chargee.push(j.energie)
        if (j.sommeil != null) sChargee.push(j.sommeil)
      }
    }
  }
  return {
    energieAvecJointMatin: moyenne(avec),
    energieSansJointMatin: moyenne(sans),
    energieApresVeilleLegere: moyenne(legere),
    energieApresVeilleChargee: moyenne(chargee),
    sommeilApresVeilleLegere: moyenne(sLegere),
    sommeilApresVeilleChargee: moyenne(sChargee),
  }
}

export interface Bilan {
  lundi: string
  faites: number
  prevues: number
  energie: number | null
  energiePrecedente: number | null
  joints: number | null
  jointsPrecedents: number | null
  partSansTabac: number | null // % des jours de conso sans joint au tabac
  victoire: string
  aTravailler: string
}

function semaineJournal(journal: JournalJour[], lundi: string): JournalJour[] {
  const fin = ajouterJours(lundi, 6)
  return journal.filter((j) => j.date >= lundi && j.date <= fin)
}

// Bilan de la semaine qui contient `iso`. Ton direct, sans morale : un fait, un chiffre.
export function bilanHebdo(
  profil: Profil,
  seances: Seance[],
  journal: JournalJour[],
  iso: string,
  recordsSemaine: string[] = [],
): Bilan {
  const lundi = lundiDe(iso)
  const dimanche = ajouterJours(lundi, 6)
  const prevues = joursPrevus(profil, lundi < profil.dateDebut ? profil.dateDebut : lundi, dimanche).length
  const faites = seances.filter((s) => s.terminee && s.date >= lundi && s.date <= dimanche).length
  const cette = semaineJournal(journal, lundi)
  const avant = semaineJournal(journal, ajouterJours(lundi, -7))
  const moy = (l: JournalJour[], f: (j: JournalJour) => number | undefined) =>
    moyenne(l.map(f).filter((v): v is number => v != null))
  const energie = moy(cette, (j) => j.energie)
  const energiePrecedente = moy(avant, (j) => j.energie)
  const joints = moy(cette, (j) => j.joints)
  const jointsPrecedents = moy(avant, (j) => j.joints)
  const conso = cette.filter((j) => (j.joints ?? 0) > 0 && j.mode)
  const partSansTabac = conso.length ? Math.round((conso.filter((j) => j.mode !== 'joint_tabac').length / conso.length) * 100) : null

  let victoire = ''
  if (recordsSemaine.length) victoire = recordsSemaine[0]
  else if (prevues > 0 && faites >= prevues) victoire = `${faites} séances sur ${prevues} : semaine complète`
  else if (energie != null && energiePrecedente != null && energie > energiePrecedente)
    victoire = `Énergie au réveil en hausse : ${energiePrecedente} → ${energie}/10`
  else if (joints != null && jointsPrecedents != null && joints < jointsPrecedents)
    victoire = `Moins de joints : ${jointsPrecedents} → ${joints} par jour en moyenne`
  else if (faites > 0) victoire = `${faites} séance${faites > 1 ? 's' : ''} faite${faites > 1 ? 's' : ''}, c'est ça qui compte`
  else victoire = 'Tu as ouvert l’app : on repart lundi'

  let aTravailler = ''
  if (prevues > 0 && faites < prevues) aTravailler = `${prevues - faites} séance${prevues - faites > 1 ? 's' : ''} sautée${prevues - faites > 1 ? 's' : ''} : vise au moins l'express de 15 min`
  else if (partSansTabac != null && partSansTabac < 50) aTravailler = `Le tabac est dans ${100 - partSansTabac} % des jours de conso : prochain palier, le vaporisateur le matin`
  else if (energie != null && energie < 5) aTravailler = 'Énergie basse au réveil : regarde le lien avec les joints du soir dans Progrès'
  else aTravailler = 'Garde le rythme : même heure, même jours'

  return { lundi, faites, prevues, energie, energiePrecedente, joints, jointsPrecedents, partSansTabac, victoire, aTravailler }
}
