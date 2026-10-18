import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import { aujourdhui, preparerSeance } from '../db/actions'
import { ajouterJours, depuisIso, NOMS_JOURS, phaseDe, semaineDe } from '../engine/dates'
import { prochaineSeance, seanceManquee, serieReguliere, typeDuJour } from '../engine/planning'
import { bilanHebdo } from '../engine/stats'
import { testAttendu } from '../engine/tests'
import { victoires } from '../engine/victoires'
import type { Profil, Seance, TypeSeance } from '../types'
import { Bouton, Carte, Pastille, Titre } from '../components/ui'
import { CheckMatin } from './CheckMatin'

export const NOMS_SEANCES: Record<TypeSeance, string> = {
  A: 'Force kettlebell',
  B: 'Cardio',
  C: 'Circuit + mobilité',
  express: 'Express 15 min',
}
const NOMS_PHASES = { 1: 'Fondation', 2: 'Montée', 3: 'Performance' }

function jourLisible(iso: string, auj: string): string {
  if (iso === auj) return 'aujourd’hui'
  if (iso === ajouterJours(auj, 1)) return 'demain'
  return `${NOMS_JOURS[depuisIso(iso).getDay()]} ${depuisIso(iso).getDate()}`
}

export function Accueil({ profil }: { profil: Profil }) {
  const auj = aujourdhui()
  const nav = useNavigate()
  const journal = useLiveQuery(() => db.journal.toArray(), [])
  const seances = useLiveQuery(() => db.seances.toArray(), [])
  const tests = useLiveQuery(() => db.tests.toArray(), [])
  const [apercu, setApercu] = useState<Seance | null>(null)
  const [modifierCheck, setModifierCheck] = useState(false)

  const jAuj = journal?.find((j) => j.date === auj)
  const checkFait = jAuj?.energie != null && jAuj?.sommeil != null
  const typeAuj = typeDuJour(profil, auj)
  const manquee = seances ? seanceManquee(profil, seances, auj) : null
  const faiteAuj = seances?.some((s) => s.date === auj && s.terminee)
  const typePropose: TypeSeance | null = faiteAuj ? null : typeAuj ?? (manquee ? 'express' : null)

  useEffect(() => {
    if (!typePropose) return setApercu(null)
    preparerSeance(typePropose, auj).then(setApercu).catch(() => setApercu(null))
  }, [typePropose, auj, jAuj?.energie, jAuj?.sommeil, seances?.length])

  if (!journal || !seances || !tests) return null

  const semaine = semaineDe(profil.dateDebut, auj)
  const phase = phaseDe(Math.max(1, semaine))
  const serie = serieReguliere(profil, seances, auj)
  const prochaine = prochaineSeance(profil, seances, faiteAuj ? ajouterJours(auj, 1) : auj)
  const test = testAttendu(profil, tests, auj)
  const bilan = bilanHebdo(profil, seances, journal, auj)
  const derniereVictoire = victoires(seances, journal, serie)[0]

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between pt-2">
        <div>
          <p className="text-sm uppercase tracking-wider text-lime-300">
            {semaine === 0 ? 'Démarrage lundi' : `Semaine ${Math.min(semaine, 12)} sur 12 · ${NOMS_PHASES[phase]}`}
          </p>
          <h1 className="text-3xl font-bold">Aujourd’hui</h1>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums">{serie}</p>
          <p className="text-xs text-zinc-400">séances d’affilée</p>
        </div>
      </header>

      {(!checkFait || modifierCheck) && (
        <CheckMatin date={auj} existant={jAuj} veille={journal.find((j) => j.date === ajouterJours(auj, -1))} onFini={() => setModifierCheck(false)} />
      )}

      {test != null && (
        <Carte className="border border-lime-400/40">
          <Titre>Test de la semaine {test}</Titre>
          <p className="mb-4 text-zinc-300">
            {test === 0 ? 'Point de départ : pompes max et 2 km. Tu sauras d’où tu pars.' : 'Pompes max, course, énergie et poids : on compare avec le dernier test.'}
          </p>
          <Bouton className="w-full" onClick={() => nav(`/tests?semaine=${test}`)}>
            Faire le test
          </Bouton>
        </Carte>
      )}

      {faiteAuj ? (
        <Carte>
          <Titre>Séance du jour</Titre>
          <p className="text-xl font-semibold">Faite. Bien joué.</p>
          {prochaine && (
            <p className="mt-2 text-zinc-400">
              Prochaine : {NOMS_SEANCES[prochaine.type]}, {jourLisible(prochaine.date, auj)}.
            </p>
          )}
        </Carte>
      ) : typePropose && apercu ? (
        <Carte className="space-y-4">
          <div className="flex items-center justify-between">
            <Titre>{manquee && !typeAuj ? 'Séance manquée' : 'Séance du jour'}</Titre>
            <Pastille ton={apercu.allegee ? 'alerte' : 'neutre'}>{apercu.plan.dureeEstimeeMin} min</Pastille>
          </div>
          <p className="text-2xl font-bold">{NOMS_SEANCES[typePropose]}</p>
          <p className="text-zinc-300">{apercu.raison}</p>
          {!checkFait && <p className="text-sm text-amber-300">Fais le check du matin : la séance s’adapte à ta forme.</p>}
          <Bouton className="w-full" onClick={() => nav(`/seance/${typePropose}`)}>
            Commencer
          </Bouton>
        </Carte>
      ) : (
        <Carte className="space-y-3">
          <Titre>Jour off</Titre>
          {prochaine && (
            <p className="text-lg">
              Prochaine séance : <b>{NOMS_SEANCES[prochaine.type]}</b>, {jourLisible(prochaine.date, auj)}.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {(['A', 'B', 'C', 'express'] as const).map((t) => (
              <Bouton key={t} variante="secondaire" className="text-base" onClick={() => nav(`/seance/${t}`)}>
                {NOMS_SEANCES[t]}
              </Bouton>
            ))}
          </div>
        </Carte>
      )}

      {derniereVictoire && (
        <Carte>
          <Titre>Dernière victoire</Titre>
          <p className="text-lg font-semibold text-lime-300">{derniereVictoire.texte}</p>
        </Carte>
      )}

      <Carte>
        <Titre>Cette semaine</Titre>
        <p className="text-lg">
          {bilan.faites} séance{bilan.faites > 1 ? 's' : ''}{bilan.prevues > 0 ? ` sur ${bilan.prevues}` : ''}
          {bilan.joints != null && <span className="text-zinc-400"> · {bilan.joints} joints/jour</span>}
        </p>
        <Link to="/progres" className="mt-2 inline-block text-lime-300 underline underline-offset-4">
          Voir le bilan et les courbes
        </Link>
      </Carte>

      <div className="flex gap-3">
        {checkFait && !modifierCheck && (
          <Bouton variante="secondaire" className="flex-1 text-base" onClick={() => setModifierCheck(true)}>
            Modifier le check
          </Bouton>
        )}
        <Bouton variante="secondaire" className="flex-1 text-base" onClick={() => nav('/poids')}>
          Me peser
        </Bouton>
      </div>
    </div>
  )
}
