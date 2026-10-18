import { EXERCICES } from '../data/exercices'
import { promptApresSeance, promptConversation, promptMatin, resumerDonnees, validerConsignes, type DonneesCoach } from '../engine/coach'
import type { MessageCoach, MotCoach } from '../types'
import { aujourdhui } from './actions'
import { coachDisponible, ecrireCoachCloud, ecrireConversation, lireCoachCloud } from './cloud'
import { db, type BaseCoach } from './db'
import { appliquerReglagesCoach } from './sync'

async function donnees(base: BaseCoach): Promise<DonneesCoach | null> {
  const profil = await base.profil.get('moi')
  if (!profil) return null
  return {
    profil,
    journal: await base.journal.toArray(),
    seances: await base.seances.toArray(),
    etats: await base.etats.toArray(),
    course: await base.course.get('course'),
    pesees: await base.pesees.orderBy('date').toArray(),
    tests: await base.tests.toArray(),
    lib: EXERCICES,
  }
}

// Après le check du matin : le mot du jour et, si besoin, l'ajustement de la séance. Une fois par jour.
export async function coachDuMatin(base: BaseCoach = db): Promise<MotCoach | null> {
  const date = aujourdhui()
  const existant = await lireCoachCloud()
  if (existant?.date === date) return existant
  const sample = await coachDisponible()
  const d = await donnees(base)
  if (!sample || !d) return null
  try {
    const brut = await sample.json(promptMatin(resumerDonnees(d, date)), { modelTier: 'default', cache: false })
    const mot = validerConsignes(brut, d, date)
    if (!mot) return null
    await ecrireCoachCloud(mot)
    await appliquerReglagesCoach(mot, base)
    return mot
  } catch {
    return null
  }
}

export async function conseilApresSeance(base: BaseCoach = db): Promise<string | null> {
  const sample = await coachDisponible()
  const d = await donnees(base)
  if (!sample || !d) return null
  try {
    const brut = await sample.json(promptApresSeance(resumerDonnees(d, aujourdhui())), { modelTier: 'default', cache: false })
    return validerConsignes(brut, d, aujourdhui())?.message ?? null
  } catch {
    return null
  }
}

export type ResultatConversation = { reponse: string; ajustement?: string } | { erreur: string }

// Une réplique : la question de JB + tout son contexte. Les ajustements éventuels s'ajoutent au mot du jour.
export async function parlerAuCoach(fil: MessageCoach[], base: BaseCoach = db): Promise<ResultatConversation> {
  const sample = await coachDisponible()
  if (!sample) return { erreur: 'Le coach répond seulement dans l’artefact Claude, une fois connecté.' }
  const d = await donnees(base)
  if (!d) return { erreur: 'Termine d’abord le premier lancement.' }
  const date = aujourdhui()
  try {
    const brut = await sample.json(promptConversation(resumerDonnees(d, date), fil), { modelTier: 'default', cache: false })
    const c = validerConsignes(brut, d, date, 'reponse')
    if (!c) return { erreur: 'Réponse illisible, réessaie dans un instant.' }
    let ajustement: string | undefined
    if (c.seance || c.reglages) {
      const avant = await lireCoachCloud()
      const mot: MotCoach = {
        date,
        message: avant?.date === date ? avant.message : c.message,
        raison: c.raison ?? avant?.raison,
        seance: c.seance ?? (avant?.date === date ? avant.seance : undefined),
        reglages: c.reglages,
      }
      await ecrireCoachCloud(mot)
      if (c.reglages) await appliquerReglagesCoach(mot, base)
      ajustement = c.raison ?? 'Séance du jour ajustée'
    }
    const nouveau: MessageCoach[] = [...fil, { role: 'coach', texte: c.message, le: new Date().toISOString() }]
    await ecrireConversation(nouveau, date).catch(() => {})
    return { reponse: c.message, ajustement }
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (code === 'rate_limited') return { erreur: 'Trop de messages d’un coup, attends une minute.' }
    if (code === 'not_granted') return { erreur: 'Autorise l’accès à Claude pour cette page (menu Autorisations de l’artefact).' }
    return { erreur: 'Le coach n’a pas pu répondre, réessaie.' }
  }
}
