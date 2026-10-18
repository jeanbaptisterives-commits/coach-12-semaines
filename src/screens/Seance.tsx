import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EXERCICES_PAR_ID } from '../data/exercices'
import { aujourdhui, preparerSeance, terminerSeance } from '../db/actions'
import { libelleBloc } from '../engine/course'
import { construireEtapes, segmentsCourse, type Etape } from '../engine/etapes'
import type { Profil, Seance as TSeance, SerieRealisee, TypeSeance } from '../types'
import { Fiche, Modale } from '../components/Fiche'
import { bip, Bouton, Carte, Echelle, fmtDuree, Pastille, Svg, Titre, useCompteARebours, vibrer, Compteur } from '../components/ui'
import { NOMS_SEANCES } from './Accueil'

const CLE_BROUILLON = 'seance-en-cours'
const parId = (id: string) => EXERCICES_PAR_ID[id]
const aideRpe = (v: number) => (v <= 6 ? 'facile, tu en avais encore' : v <= 8 ? 'dur, 2-3 reps en réserve' : v === 9 ? 'très dur, 1 rep en réserve' : 'maximum')
const NOMS_BLOCS = { echauffement: 'Échauffement', principal: 'Séance', retour: 'Retour au calme' }

interface Brouillon {
  seance: TSeance
  pas: number
  debut: number
}

function lireBrouillon(type: string): Brouillon | null {
  try {
    const b = JSON.parse(localStorage.getItem(CLE_BROUILLON) ?? 'null') as Brouillon | null
    return b && b.seance.type === type && b.seance.date === aujourdhui() ? b : null
  } catch {
    return null
  }
}

export function Seance({ profil }: { profil: Profil }) {
  const { type } = useParams<{ type: TypeSeance }>()
  const nav = useNavigate()
  const [seance, setSeance] = useState<TSeance | null>(null)
  const [pas, setPas] = useState(-1) // -1 = avant de démarrer
  const [debut, setDebut] = useState(0)
  const [fin, setFin] = useState<string[] | null>(null)
  const [fiche, setFiche] = useState<string | null>(null)
  const [maintenant, setMaintenant] = useState(Date.now())

  useEffect(() => {
    const b = lireBrouillon(type ?? '')
    if (b) {
      setSeance(b.seance)
      setPas(b.pas)
      setDebut(b.debut)
    } else if (type) preparerSeance(type).then(setSeance)
  }, [type])

  useEffect(() => {
    if (pas < 0 || fin) return
    const t = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(t)
  }, [pas, fin])

  const etapes = useMemo(() => (seance ? construireEtapes(seance, parId) : []), [seance])

  // Garde l'écran allumé pendant la séance (iOS 16.4+), sinon le minuteur disparaît en pleine série.
  useEffect(() => {
    if (pas < 0 || fin) return
    let verrou: WakeLockSentinel | undefined
    const prendre = () => navigator.wakeLock?.request('screen').then((v) => (verrou = v)).catch(() => {})
    prendre()
    const auRetour = () => document.visibilityState === 'visible' && prendre()
    document.addEventListener('visibilitychange', auRetour)
    return () => {
      document.removeEventListener('visibilitychange', auRetour)
      verrou?.release().catch(() => {})
    }
  }, [pas < 0, fin])

  useEffect(() => {
    if (seance && pas >= 0 && !fin) {
      try {
        localStorage.setItem(CLE_BROUILLON, JSON.stringify({ seance, pas, debut }))
      } catch {
        /* stockage plein ou privé : la séance continue quand même */
      }
    }
  }, [seance, pas, debut, fin])

  if (!seance) return <p className="pt-10 text-center text-zinc-400">Préparation de la séance…</p>

  async function terminer(s: TSeance) {
    const msgs = await terminerSeance({ ...s, dureeSec: Math.round((Date.now() - debut) / 1000) })
    try {
      localStorage.removeItem(CLE_BROUILLON)
    } catch {
      /* rien */
    }
    setFin(msgs)
  }

  function avancer(s: TSeance) {
    setSeance(s)
    if (pas + 1 >= etapes.length) terminer(s)
    else setPas(pas + 1)
  }

  if (fin) {
    return (
      <div className="space-y-4 pt-4">
        <h1 className="text-3xl font-bold">Séance terminée</h1>
        <Carte className="space-y-2">
          <p className="text-lg">
            {fmtDuree((Date.now() - debut) / 1000)} · {NOMS_SEANCES[seance.type]}
          </p>
          {fin.length > 0 ? (
            <>
              <Titre>Pour la prochaine fois</Titre>
              <ul className="space-y-1.5">
                {fin.map((m) => (
                  <li key={m} className="text-lime-300">
                    {m}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-zinc-400">{seance.allegee ? 'Séance allégée : les cibles restent les mêmes.' : 'Mêmes cibles la prochaine fois.'}</p>
          )}
        </Carte>
        <Bouton className="w-full" onClick={() => nav('/')}>
          Retour à l’accueil
        </Bouton>
      </div>
    )
  }

  if (pas < 0) return <Avant seance={seance} onChange={setSeance} onDemarrer={() => { setDebut(Date.now()); setPas(0) }} onFiche={setFiche} fiche={fiche} />

  const etape = etapes[pas]
  const chrono = fmtDuree((maintenant - debut) / 1000)
  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">
          Étape {pas + 1} / {etapes.length}
        </span>
        <span className="font-mono text-lg tabular-nums text-zinc-300">{chrono}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-lime-400 transition-all" style={{ width: `${(pas / etapes.length) * 100}%` }} />
      </div>
      {etape.genre === 'course' ? (
        <EtapeCourse key="course" seance={seance} onFini={(c) => avancer({ ...seance, course: c })} />
      ) : (
        <EtapeExercice
          key={`${etape.index}-${etape.serie}`}
          seance={seance}
          etape={etape}
          profil={profil}
          onFiche={setFiche}
          onValider={(serie) => {
            const exercices = seance.exercices.map((e, i) => (i === etape.index ? { ...e, series: [...e.series.slice(0, etape.serie), serie] } : e))
            avancer({ ...seance, exercices })
          }}
          onPasser={() => avancer(seance)}
          dernier={pas + 1 >= etapes.length}
          suivant={etapes[pas + 1]}
        />
      )}
      <div className="flex justify-between pt-2">
        <Bouton variante="fantome" onClick={() => pas > 0 && setPas(pas - 1)} disabled={pas === 0}>
          Étape précédente
        </Bouton>
        <Bouton variante="fantome" onClick={() => confirm('Finir la séance maintenant ? Ce qui est fait est enregistré.') && terminer(seance)}>
          Finir ici
        </Bouton>
      </div>
      <Modale ouvert={!!fiche} titre={fiche ? parId(fiche)?.nom ?? '' : ''} onFermer={() => setFiche(null)}>
        {fiche && parId(fiche) && <Fiche ex={parId(fiche)} />}
      </Modale>
    </div>
  )
}

function Avant({
  seance,
  onChange,
  onDemarrer,
  onFiche,
  fiche,
}: {
  seance: TSeance
  onChange: (s: TSeance) => void
  onDemarrer: () => void
  onFiche: (id: string | null) => void
  fiche: string | null
}) {
  const p = seance.plan
  const ligne = (id: string, detail: string) => (
    <li key={id + detail}>
      <button type="button" onClick={() => onFiche(id)} className="flex w-full items-center justify-between gap-3 py-2 text-left">
        <span>{parId(id)?.nom ?? id}</span>
        <span className="shrink-0 text-sm text-zinc-400">{detail}</span>
      </button>
    </li>
  )
  const detail = (x: { series: number; reps: number; charge?: number; exerciceId: string }) => {
    const ex = parId(x.exerciceId)
    const u = ex?.mesure === 'duree' ? ' s' : ex?.unilateral ? '/côté' : ''
    return `${x.series > 1 ? `${x.series} × ` : ''}${x.reps}${u}${x.charge ? ` · ${x.charge} kg` : ''}`
  }
  return (
    <div className="space-y-4 pt-2">
      <header>
        <p className="text-sm uppercase tracking-wider text-lime-300">
          Semaine {seance.semaine} · {p.dureeEstimeeMin} min
        </p>
        <h1 className="text-3xl font-bold">{NOMS_SEANCES[seance.type]}</h1>
      </header>
      <Carte className={seance.allegee ? 'border border-amber-400/40' : ''}>
        <p className="text-lg">{seance.raison}</p>
      </Carte>
      <Carte>
        <Titre>Échauffement</Titre>
        <ul className="divide-y divide-zinc-800">{p.echauffement.map((x) => ligne(x.exerciceId, detail(x)))}</ul>
        {p.course && (
          <>
            <Titre>Course</Titre>
            <p className="pb-2">{libelleBloc(p.course)}</p>
            <p className="pb-2 text-sm text-zinc-400">En aisance respiratoire : tu dois pouvoir parler. Avec ta chienne, c’est elle qui donne le rythme des pauses.</p>
          </>
        )}
        {p.principal.length > 0 && (
          <>
            <Titre>{seance.type === 'C' ? 'Circuit et mobilité' : 'Exercices'}</Titre>
            <ul className="divide-y divide-zinc-800">{p.principal.map((x) => ligne(x.exerciceId, detail(x)))}</ul>
          </>
        )}
        <Titre>Retour au calme</Titre>
        <ul className="divide-y divide-zinc-800">{p.retourCalme.map((x) => ligne(x.exerciceId, detail(x)))}</ul>
      </Carte>
      <label className="flex min-h-16 items-center gap-4 rounded-3xl bg-zinc-900 px-5">
        <input type="checkbox" checked={seance.zeroJoint} onChange={(e) => onChange({ ...seance, zeroJoint: e.target.checked })} className="size-7 accent-lime-400" />
        <span className="text-lg">Zéro joint avant la séance</span>
      </label>
      <Bouton className="w-full" onClick={onDemarrer}>
        Démarrer
      </Bouton>
      <Modale ouvert={!!fiche} titre={fiche ? parId(fiche)?.nom ?? '' : ''} onFermer={() => onFiche(null)}>
        {fiche && parId(fiche) && <Fiche ex={parId(fiche)} />}
      </Modale>
    </div>
  )
}

function EtapeExercice({
  seance,
  etape,
  profil,
  onFiche,
  onValider,
  onPasser,
  dernier,
  suivant,
}: {
  seance: TSeance
  etape: Extract<Etape, { genre: 'exercice' }>
  profil: Profil
  onFiche: (id: string) => void
  onValider: (s: SerieRealisee) => void
  onPasser: () => void
  dernier: boolean
  suivant?: Etape
}) {
  const er = seance.exercices[etape.index]
  const ex = parId(er.exerciceId)
  const prevu = er.prevu
  const deja = er.series[etape.serie]
  const suivie = etape.bloc === 'principal' && prevu.series > 1 && !!ex?.fourchette
  const [reps, setReps] = useState(deja?.reps ?? prevu.reps)
  const [charge, setCharge] = useState(deja?.charge ?? prevu.charge)
  const [rpe, setRpe] = useState<number | undefined>(deja?.rpe || undefined)
  const [douleur, setDouleur] = useState(deja?.douleur ?? false)
  const [repos, setRepos] = useState(false)
  const effort = useCompteARebours()
  const pause = useCompteARebours(() => {
    setRepos(false)
    envoyer.current?.()
  })
  const envoyer = useRef<(() => void) | null>(null)

  if (!ex) return <Bouton onClick={onPasser}>Exercice introuvable, passer</Bouton>
  const duree = ex.mesure === 'duree'
  const unite = duree ? ' s' : ex.unilateral ? ' /côté' : ' reps'

  function valider() {
    const serie: SerieRealisee = { reps, charge: ex?.chargeable ? charge : undefined, rpe: suivie ? (rpe ?? 7) : 0, douleur }
    const reposSec = etape.bloc === 'principal' && !dernier && suivant?.genre === 'exercice' && suivant.bloc === 'principal' ? prevu.reposSec : 0
    if (reposSec > 0) {
      envoyer.current = () => onValider(serie)
      setRepos(true)
      pause.demarrer(reposSec)
    } else onValider(serie)
  }

  if (repos) {
    const prochain = suivant?.genre === 'exercice' ? parId(seance.exercices[suivant.index].exerciceId) : undefined
    return (
      <Carte className="space-y-6 py-10 text-center">
        <Titre>Repos</Titre>
        <p className="font-mono text-7xl font-bold tabular-nums">{fmtDuree(pause.reste)}</p>
        {prochain && <p className="text-zinc-400">Ensuite : {prochain.nom}</p>}
        <div className="flex gap-3">
          <Bouton variante="secondaire" className="flex-1" onClick={() => pause.demarrer(pause.reste + 15)}>
            +15 s
          </Bouton>
          <Bouton
            className="flex-1"
            onClick={() => {
              pause.arreter()
              setRepos(false)
              envoyer.current?.()
            }}
          >
            Passer
          </Bouton>
        </div>
      </Carte>
    )
  }

  return (
    <div className="space-y-4">
      <Carte className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wider text-lime-300">
              {NOMS_BLOCS[etape.bloc]}
              {etape.tours ? ` · tour ${etape.tour}/${etape.tours}` : suivie ? ` · série ${etape.serie + 1}/${prevu.series}` : ''}
            </p>
            <h2 className="text-2xl font-bold">{ex.nom}</h2>
          </div>
          <button type="button" onClick={() => onFiche(ex.id)} className="size-20 shrink-0 rounded-2xl bg-zinc-800 p-2 text-lime-300" aria-label="Voir la fiche">
            <Svg code={ex.svg} className="h-full w-full" />
          </button>
        </div>
        <p className="text-3xl font-bold tabular-nums">
          {prevu.reps}
          <span className="text-lg text-zinc-400">{unite}</span>
          {prevu.charge != null && <span className="text-zinc-300"> · {prevu.charge} kg</span>}
        </p>
        {prevu.note && <p className="text-zinc-300">{prevu.note}</p>}
        <Bouton variante="fantome" className="min-h-10! px-0! text-base" onClick={() => onFiche(ex.id)}>
          Voir la fiche
        </Bouton>
      </Carte>

      {duree && (
        <Carte className="space-y-3 text-center">
          <p className="font-mono text-6xl font-bold tabular-nums">{fmtDuree(effort.actif ? effort.reste : reps)}</p>
          <Bouton
            className="w-full"
            variante={effort.actif ? 'secondaire' : 'principal'}
            onClick={() => {
              if (effort.actif) effort.arreter()
              else {
                bip(880, 120)
                vibrer(100)
                effort.demarrer(reps)
              }
            }}
          >
            {effort.actif ? 'Arrêter' : `Lancer ${reps} s`}
          </Bouton>
        </Carte>
      )}

      {suivie || etape.bloc === 'principal' ? (
        <Carte className="space-y-5">
          <Compteur label={duree ? 'Secondes tenues' : ex.unilateral ? 'Reps par côté' : 'Reps faites'} valeur={reps} onChange={setReps} pas={duree ? 5 : 1} />
          {ex.chargeable && profil.kettlebells.length > 0 && (
            <div className="space-y-2">
              <p className="text-zinc-300">Charge</p>
              <div className="flex flex-wrap gap-2">
                {profil.kettlebells.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCharge(k)}
                    className={`h-12 min-w-16 rounded-xl px-3 font-semibold ${charge === k ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800'}`}
                  >
                    {k} kg
                  </button>
                ))}
              </div>
            </div>
          )}
          {suivie && <Echelle label="Ressenti (RPE)" valeur={rpe} onChange={setRpe} aide={aideRpe} />}
          <button
            type="button"
            onClick={() => setDouleur(!douleur)}
            className={`min-h-14 w-full rounded-2xl text-lg font-semibold ${douleur ? 'bg-red-500 text-white' : 'bg-zinc-800 text-red-300'}`}
          >
            {douleur ? 'Douleur signalée' : 'Douleur ?'}
          </button>
          {douleur && <p className="text-sm text-red-300">Arrête cet exercice s’il fait mal. Il sera remplacé par une version plus sûre la prochaine fois.</p>}
        </Carte>
      ) : null}

      <Bouton className="w-full" disabled={suivie && rpe == null} onClick={valider}>
        {suivie ? 'Valider la série' : 'Fait'}
      </Bouton>
      {suivie && rpe == null && <p className="text-center text-sm text-zinc-400">Indique ton ressenti pour valider.</p>}
      <Bouton variante="fantome" className="w-full" onClick={onPasser}>
        Passer
      </Bouton>
    </div>
  )
}

function EtapeCourse({ seance, onFini }: { seance: TSeance; onFini: (c: NonNullable<TSeance['course']>) => void }) {
  const segments = useMemo(() => segmentsCourse(seance.plan.course!), [seance.plan.course])
  const [i, setI] = useState(-1)
  const [finie, setFinie] = useState<boolean | null>(null)
  const [rpe, setRpe] = useState<number>()
  const [douleur, setDouleur] = useState(false)
  const compte = useCompteARebours(() => {
    if (i + 1 < segments.length) {
      setI(i + 1)
      compte.demarrer(segments[i + 1].sec)
    } else {
      setFinie(true)
    }
  })

  if (finie != null) {
    return (
      <Carte className="space-y-5">
        <h2 className="text-2xl font-bold">{finie ? 'Course terminée' : 'Course arrêtée'}</h2>
        <Echelle label="Ressenti (RPE)" valeur={rpe} onChange={setRpe} aide={(v) => (v <= 5 ? 'tu pouvais parler' : v <= 7 ? 'phrases courtes' : 'à bout de souffle')} />
        <button
          type="button"
          onClick={() => setDouleur(!douleur)}
          className={`min-h-14 w-full rounded-2xl text-lg font-semibold ${douleur ? 'bg-red-500 text-white' : 'bg-zinc-800 text-red-300'}`}
        >
          {douleur ? 'Douleur signalée' : 'Douleur ?'}
        </button>
        <Bouton className="w-full" disabled={rpe == null} onClick={() => onFini({ rpe: rpe!, douleur, terminee: finie })}>
          Continuer
        </Bouton>
      </Carte>
    )
  }

  const seg = segments[Math.max(0, i)]
  const nbBlocs = segments.filter((s) => s.genre === 'course').length
  return (
    <Carte className={`space-y-6 py-8 text-center ${i >= 0 && seg.genre === 'course' ? 'bg-lime-950!' : ''}`}>
      <Pastille>{libelleBloc(seance.plan.course!)}</Pastille>
      {i < 0 ? (
        <>
          <p className="text-zinc-300">Bip à chaque changement. Rythme où tu peux parler.</p>
          <Bouton
            className="w-full"
            onClick={() => {
              setI(0)
              bip()
              compte.demarrer(segments[0].sec)
            }}
          >
            Lancer la course
          </Bouton>
        </>
      ) : (
        <>
          <p className={`text-5xl font-black ${seg.genre === 'course' ? 'text-lime-300' : 'text-sky-300'}`}>{seg.genre === 'course' ? 'COURS' : 'MARCHE'}</p>
          <p className="font-mono text-7xl font-bold tabular-nums">{fmtDuree(compte.reste)}</p>
          {nbBlocs > 1 && (
            <p className="text-zinc-400">
              Bloc {seg.bloc} / {nbBlocs}
            </p>
          )}
          <Bouton
            variante="secondaire"
            className="w-full"
            onClick={() => {
              compte.arreter()
              setFinie(false)
            }}
          >
            Arrêter la course
          </Bouton>
        </>
      )}
    </Carte>
  )
}
