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
import { chargerCoach, coachDuJour } from '../db/sync'
import { coachDuMatin } from '../db/coachService'
import { ecouterCoach, enArtefact } from '../db/cloud'
import type { MotCoach } from '../types'

export const NOMS_SEANCES: Record<TypeSeance, string> = {
  A: 'Force kettlebell',
  B: 'Cardio',
  C: 'Circuit + mobilité',
  express: 'Express 15 min',
  etirement: 'Étirements',
}
const NOMS_PHASES = { 1: 'Fondation', 2: 'Montée', 3: 'Performance' }

// Les séances proposées selon l'envie du jour, en plus de la séance du programme.
const ENVIES = [
  { id: 'A', nom: 'Force kettlebell', detail: 'Swing, squat, rowing, pompes', etiquette: 'FORCE', teinte: '#c4a35a', lien: '/seance/A' },
  { id: 'B', nom: 'Course avec la chienne', detail: 'Course-marche à ton rythme', etiquette: 'CARDIO', teinte: '#c98f5e', lien: '/seance/B' },
  { id: 'C', nom: 'Circuit et mobilité', detail: 'Poids du corps, sans matériel', etiquette: 'CIRCUIT', teinte: '#7a8b6f', lien: '/seance/C' },
  { id: 'express', nom: 'Express 15 min', detail: 'Quand le temps manque', etiquette: 'EXPRESS', teinte: '#b07d5b', lien: '/seance/express' },
  { id: 'etirement', nom: 'Étirements', detail: '6 programmes de 8 à 12 min', etiquette: 'MOBILITÉ', teinte: '#a9ba9c', lien: '/etirements' },
  { id: 'coach', nom: 'Demander au coach', detail: 'Il te propose la séance', etiquette: 'COACH', teinte: '#8fa3a0', lien: '/coach' },
]

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
  const [coach, setCoach] = useState<MotCoach | null>(null)
  const [coachEnCours, setCoachEnCours] = useState(false)
  useEffect(() => {
    chargerCoach().then((c) => setCoach(coachDuJour(c, auj)))
    // Le mot du coach peut arriver d'ailleurs (Claude qui écrit dans l'artefact) : on l'écoute en direct.
    return ecouterCoach((c) => setCoach(coachDuJour(c, auj)))
  }, [auj])
  const demanderMotDuJour = () => {
    if (!enArtefact()) return
    setCoachEnCours(true)
    coachDuMatin()
      .then((c) => c && setCoach(coachDuJour(c, auj)))
      .finally(() => setCoachEnCours(false))
  }

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
  const carte = profil.programme === 'carte'
  const serie = carte ? seances.filter((s) => s.terminee && s.date > ajouterJours(auj, -7)).length : serieReguliere(profil, seances, auj)
  const prochaine = prochaineSeance(profil, seances, faiteAuj ? ajouterJours(auj, 1) : auj)
  const test = testAttendu(profil, tests, auj)
  const bilan = bilanHebdo(profil, seances, journal, auj)
  const derniereVictoire = victoires(seances, journal, serie)[0]

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between pt-2">
        <div>
          <p className="text-sm uppercase tracking-wider text-sauge-clair">
            {carte ? 'Programme à la carte' : semaine === 0 ? 'Démarrage lundi' : `Semaine ${Math.min(semaine, 12)} sur 12 · ${NOMS_PHASES[phase]}`}
          </p>
          <h1 className="text-3xl font-bold">Aujourd’hui</h1>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums">{serie}</p>
          <p className="text-xs text-ivoire2">{carte ? 'séances en 7 jours' : 'séances d’affilée'}</p>
        </div>
      </header>

      {(coach || coachEnCours || enArtefact()) && (
        <Carte className="border border-sauge/40">
          <Titre>Le mot du coach</Titre>
          {coach ? (
            <>
              <p className="text-lg leading-relaxed">{coach.message}</p>
              {coach.raison && (coach.seance || coach.reglages) && <p className="mt-2 text-sm text-dore">Ajusté : {coach.raison}</p>}
            </>
          ) : coachEnCours ? (
            <p className="text-ivoire2">Le coach lit tes réponses…</p>
          ) : (
            <p className="text-ivoire2">{checkFait ? 'Pas encore de mot aujourd’hui.' : 'Fais ton check du matin : le coach te répond juste après.'}</p>
          )}
          {enArtefact() && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Bouton variante="secondaire" className="flex-1 text-base" onClick={() => nav('/coach')}>
                Parler au coach
              </Bouton>
              {checkFait && !coach && !coachEnCours && (
                <Bouton variante="secondaire" className="flex-1 text-base" onClick={demanderMotDuJour}>
                  Mot du jour
                </Bouton>
              )}
            </div>
          )}
        </Carte>
      )}

      {(!checkFait || modifierCheck) && (
        <CheckMatin
          date={auj}
          existant={jAuj}
          veille={journal.find((j) => j.date === ajouterJours(auj, -1))}
          onFini={() => {
            setModifierCheck(false)
            demanderMotDuJour()
          }}
        />
      )}

      {test != null && (
        <Carte className="border border-dore/40">
          <Titre>Test de la semaine {test}</Titre>
          <p className="mb-4 text-ivoire/85">
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
            <p className="mt-2 text-ivoire2">
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
          <p className="text-ivoire/85">{apercu.raison}</p>
          {!checkFait && <p className="text-sm text-alerte">Fais le check du matin : la séance s’adapte à ta forme.</p>}
          <Bouton className="w-full" onClick={() => nav(`/seance/${typePropose}`)}>
            Commencer
          </Bouton>
        </Carte>
      ) : (
        <Carte className="space-y-2">
          <Titre>{carte ? 'À la carte' : 'Jour off'}</Titre>
          {carte ? (
            <p className="text-lg">Choisis ta séance selon ton envie, juste en dessous.</p>
          ) : (
            prochaine && (
              <p className="text-lg">
                Prochaine séance : <b>{NOMS_SEANCES[prochaine.type]}</b>, {jourLisible(prochaine.date, auj)}.
              </p>
            )
          )}
        </Carte>
      )}

      <section className="space-y-3">
        <Titre>Selon ton envie</Titre>
        <div className="grid grid-cols-2 gap-3">
          {ENVIES.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => nav(e.lien)}
              className="flex min-h-24 flex-col justify-between rounded-3xl p-4 text-left active:scale-[0.98]"
              style={{ background: `linear-gradient(150deg, ${e.teinte}30, ${e.teinte}0d)`, boxShadow: `inset 0 0 0 1px ${e.teinte}45` }}
            >
              <span className="text-xs font-semibold tracking-widest" style={{ color: e.teinte }}>
                {e.etiquette}
              </span>
              <span>
                <span className="block font-titre text-xl leading-tight">{e.nom}</span>
                <span className="block text-xs text-ivoire2">{e.detail}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {derniereVictoire && (
        <Carte>
          <Titre>Dernière victoire</Titre>
          <p className="text-lg font-semibold text-sauge-clair">{derniereVictoire.texte}</p>
        </Carte>
      )}

      <Carte>
        <Titre>Cette semaine</Titre>
        <p className="text-lg">
          {bilan.faites} séance{bilan.faites > 1 ? 's' : ''}{bilan.prevues > 0 ? ` sur ${bilan.prevues}` : ''}
          {bilan.joints != null && <span className="text-ivoire2"> · {bilan.joints} joints/jour</span>}
        </p>
        <Link to="/progres" className="mt-2 inline-block text-sauge-clair underline underline-offset-4">
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
