import { liveQuery } from 'dexie'
import { EXERCICES } from '../data/exercices'
import { isoLocal } from '../engine/dates'
import type { EtatExercice, MotCoach } from '../types'
import { db, exporter, importer, TABLES, type BaseCoach } from './db'
import { cloudActif, lireCoachCloud } from './cloud'

// Version Mac : un serveur local sert l'app et garde les données dans un fichier que Claude lit.
// Le navigateur garde une copie (IndexedDB) ; le fichier du Mac fait foi.
// Sur la version en ligne (GitHub Pages), il n'y a pas de serveur : tout ce fichier ne fait rien.

const CLE_ATTENTE = 'sync-en-attente'
const CLE_COACH = 'coach-reglages-appliques'

export type EtatSync = 'hors-mac' | 'ok' | 'en-cours' | 'erreur'
let etat: EtatSync = 'hors-mac'
const abonnes = new Set<(e: EtatSync) => void>()
function changer(e: EtatSync) {
  etat = e
  abonnes.forEach((f) => f(e))
}
export const etatSync = () => etat
export function surEtatSync(f: (e: EtatSync) => void): () => void {
  abonnes.add(f)
  return () => abonnes.delete(f)
}

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle)
  } catch {
    return null
  }
}
function ecrire(cle: string, v: string | null) {
  try {
    if (v == null) localStorage.removeItem(cle)
    else localStorage.setItem(cle, v)
  } catch {
    /* navigation privée : on continue sans */
  }
}

async function appelJson(chemin: string, init?: RequestInit): Promise<{ statut: number; json: unknown } | null> {
  try {
    const r = await fetch(chemin, { cache: 'no-store', ...init })
    if (!(r.headers.get('content-type') ?? '').includes('application/json')) return null // pas de serveur (GitHub Pages)
    return { statut: r.status, json: await r.json() }
  } catch {
    return null
  }
}

async function envoyer(base: BaseCoach) {
  ecrire(CLE_ATTENTE, '1')
  changer('en-cours')
  const r = await appelJson('./api/donnees', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    // La liste des exercices voyage avec les données : le coach du matin sait ce qui est sûr pour les épaules.
    body: JSON.stringify({
      ...(await exporter(base)),
      bibliotheque: EXERCICES.map((e) => ({ id: e.id, nom: e.nom, famille: e.famille, surEpaules: e.surEpaules, intensite: e.intensite, chargeable: !!e.chargeable })),
    }),
  })
  if (r?.statut === 200) {
    ecrire(CLE_ATTENTE, null)
    changer('ok')
  } else changer('erreur')
}

// Au démarrage : récupère le fichier du Mac (sauf modification locale pas encore envoyée),
// puis envoie chaque changement au Mac, regroupé à la seconde.
export async function demarrerSync(base: BaseCoach = db): Promise<boolean> {
  const r = await appelJson('./api/donnees')
  if (!r) return false
  if (r.statut === 200 && !lire(CLE_ATTENTE)) await importer(r.json, base)
  else if (lire(CLE_ATTENTE) || r.statut === 404) await envoyer(base)
  changer('ok')

  let minuteur: ReturnType<typeof setTimeout> | undefined
  let premier = true
  liveQuery(() => Promise.all(TABLES.map((t) => base.table(t).count().then((n) => base.table(t).toArray().then((l) => [n, l])))))
    .subscribe({
      next: () => {
        if (premier) return void (premier = false) // l'état initial n'est pas un changement
        ecrire(CLE_ATTENTE, '1')
        clearTimeout(minuteur)
        minuteur = setTimeout(() => envoyer(base), 1000)
      },
    })
  addEventListener('online', () => lire(CLE_ATTENTE) && envoyer(base))
  // Le Mac et le téléphone partagent le même fichier : en revenant sur l'app, on reprend la version
  // du Mac (sauf si une saisie locale n'est pas encore partie, auquel cas on l'envoie d'abord).
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return
    if (lire(CLE_ATTENTE)) return envoyer(base)
    const frais = await appelJson('./api/donnees')
    if (frais?.statut === 200 && !lire(CLE_ATTENTE)) {
      premier = true // l'import n'est pas une saisie : ne pas le renvoyer
      await importer(frais.json, base)
    }
  })
  return true
}

export async function chargerCoach(): Promise<MotCoach | null> {
  if (cloudActif()) return lireCoachCloud()
  const r = await appelJson('./api/coach')
  return r?.statut === 200 ? (r.json as MotCoach) : null
}

// Réglages durables du coach (charges, reps, course) : appliqués une seule fois par mot du coach.
export async function appliquerReglagesCoach(coach: MotCoach, base: BaseCoach = db): Promise<boolean> {
  const g = coach.reglages
  const cle = `${coach.date}:${JSON.stringify(g ?? {})}`
  if (!g || lire(CLE_COACH) === cle) return false
  await base.transaction('rw', base.etats, base.course, async () => {
    const ids = new Set([...Object.keys(g.charges ?? {}), ...Object.keys(g.repsCible ?? {})])
    for (const id of ids) {
      const e = (await base.etats.get(id)) as EtatExercice | undefined
      if (!e) continue // l'exercice n'a encore jamais été fait : rien à ajuster
      await base.etats.put({
        ...e,
        charge: g.charges?.[id] ?? e.charge,
        repsCible: g.repsCible?.[id] ?? e.repsCible,
        dernierChangement: `ajusté par le coach le ${coach.date.split('-').reverse().slice(0, 2).join('/')}`,
      })
    }
    if (g.course) {
      const avant = await base.course.get('course')
      await base.course.put({ ...avant, id: 'course', ...g.course, message: 'Course ajustée par le coach' })
    }
  })
  ecrire(CLE_COACH, cle)
  return true
}

export const coachDuJour = (coach: MotCoach | null, date = isoLocal(new Date())) => (coach?.date === date ? coach : null)
