import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EXERCICES_PAR_ID } from '../data/exercices'
import { aujourdhui, preparerSeance, terminerSeance } from '../db/actions'
import { conseilApresSeance } from '../db/coachService'
import { enArtefact } from '../db/cloud'
import { db } from '../db/db'
import { libelleBloc } from '../engine/course'
import { construireEtapes, segmentsCourse, type Etape } from '../engine/etapes'
import type { Profil, Seance as TSeance, SerieRealisee, TypeSeance } from '../types'
import { Fiche, Modale } from '../components/Fiche'
import { Animation } from '../components/Animation'
import { bip, Bouton, Carte, Echelle, fmtDuree, Pastille, Titre, useCompteARebours, vibrer, Compteur } from '../components/ui'
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

function lireBrouillon(type: string, prog?: string): Brouillon | null {
  try {
    const b = JSON.parse(localStorage.getItem(CLE_BROUILLON) ?? 'null') as Brouillon | null
    return b && b.seance.type === type && (b.seance.etirement ?? '') === (prog ?? '') && b.seance.date === aujourdhui() ? b : null
  } catch {
    return null
  }
}

export function Seance({ profil }: { profil: Profil }) {
  const { type, prog } = useParams<{ type: TypeSeance; prog?: string }>()
  const nav = useNavigate()
  const [seance, setSeance] = useState<TSeance | null>(null)
  const [pas, setPas] = useState(-1) // -1 = avant de démarrer
  const [debut, setDebut] = useState(0)
  const [fin, setFin] = useState<string[] | null>(null)
  const [conseil, setConseil] = useState<string | null>(null)
  const [confirmerFin, setConfirmerFin] = useState(false)
  const [fiche, setFiche] = useState<string | null>(null)
  const [maintenant, setMaintenant] = useState(Date.now())

  useEffect(() => {
    const b = lireBrouillon(type ?? '', prog)
    if (b) {
      setSeance(b.seance)
      setPas(b.pas)
      setDebut(b.debut)
    } else if (type) preparerSeance(type, aujourdhui(), undefined, prog).then(setSeance)
  }, [type, prog])

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

  if (!seance) return <p className="pt-10 text-center text-ivoire2">Préparation de la séance…</p>

  async function terminer(s: TSeance) {
    const msgs = await terminerSeance({ ...s, dureeSec: Math.round((Date.now() - debut) / 1000) })
    try {
      localStorage.removeItem(CLE_BROUILLON)
    } catch {
      /* rien */
    }
    setFin(msgs)
    // Le retour du coach, enregistré avec la séance pour que Claude le retrouve.
    if (enArtefact()) {
      setConseil('…')
      const c = await conseilApresSeance()
      setConseil(c)
      if (c) {
        const derniere = await db.seances.orderBy('id').last()
        if (derniere?.id != null) await db.seances.update(derniere.id, { conseil: c })
      }
    }
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
                  <li key={m} className="text-sauge-clair">
                    {m}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-ivoire2">{seance.allegee ? 'Séance allégée : les cibles restent les mêmes.' : 'Mêmes cibles la prochaine fois.'}</p>
          )}
        </Carte>
        {conseil && (
          <Carte className="space-y-2 border border-sauge/40">
            <Titre>Le coach</Titre>
            <p className="text-lg leading-relaxed">{conseil === '…' ? 'Le coach regarde ta séance…' : conseil}</p>
          </Carte>
        )}
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
        <span className="text-sm text-ivoire2">
          Étape {pas + 1} / {etapes.length}
        </span>
        <span className="font-mono text-lg tabular-nums text-ivoire/85">{chrono}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-carte2">
        <div className="h-full bg-dore transition-all" style={{ width: `${(pas / etapes.length) * 100}%` }} />
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
        {confirmerFin ? (
          <Bouton variante="danger" className="text-base" onClick={() => terminer(seance)}>
            Oui, finir ici
          </Bouton>
        ) : (
          <Bouton variante="fantome" onClick={() => setConfirmerFin(true)}>
            Finir ici
          </Bouton>
        )}
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
        <span className="shrink-0 text-sm text-ivoire2">{detail}</span>
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
        <p className="text-sm uppercase tracking-wider text-sauge-clair">
          Semaine {seance.semaine} · {p.dureeEstimeeMin} min
        </p>
        <h1 className="text-3xl font-bold">{NOMS_SEANCES[seance.type]}</h1>
      </header>
      <Carte className={seance.allegee ? 'border border-alerte/40' : ''}>
        <p className="text-lg">{seance.raison}</p>
      </Carte>
      <Carte>
        {p.echauffement.length > 0 && (
          <>
            <Titre>Échauffement</Titre>
            <ul className="divide-y divide-ligne">{p.echauffement.map((x) => ligne(x.exerciceId, detail(x)))}</ul>
          </>
        )}
        {p.course && (
          <>
            <Titre>Course</Titre>
            <p className="pb-2">{libelleBloc(p.course)}</p>
            <p className="pb-2 text-sm text-ivoire2">En aisance respiratoire : tu dois pouvoir parler. Avec ta chienne, c’est elle qui donne le rythme des pauses.</p>
          </>
        )}
        {p.principal.length > 0 && (
          <>
            <Titre>{seance.type === 'C' ? 'Circuit et mobilité' : seance.type === 'etirement' ? 'Programme' : 'Exercices'}</Titre>
            <ul className="divide-y divide-ligne">{p.principal.map((x) => ligne(x.exerciceId, detail(x)))}</ul>
          </>
        )}
        {p.retourCalme.length > 0 && (
          <>
            <Titre>Retour au calme</Titre>
            <ul className="divide-y divide-ligne">{p.retourCalme.map((x) => ligne(x.exerciceId, detail(x)))}</ul>
          </>
        )}
      </Carte>
      <label className="flex min-h-16 items-center gap-4 rounded-3xl bg-carte px-5">
        <input type="checkbox" checked={seance.zeroJoint} onChange={(e) => onChange({ ...seance, zeroJoint: e.target.checked })} className="size-7 accent-[#c4a35a]" />
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
        {prochain && <p className="text-ivoire2">Ensuite : {prochain.nom}</p>}
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
        <div>
          <p className="text-sm uppercase tracking-wider text-sauge-clair">
            {NOMS_BLOCS[etape.bloc]}
            {etape.tours ? ` · tour ${etape.tour}/${etape.tours}` : suivie ? ` · série ${etape.serie + 1}/${prevu.series}` : ''}
          </p>
          <h2 className="font-titre text-3xl">{ex.nom}</h2>
        </div>
        <button type="button" onClick={() => onFiche(ex.id)} className="block w-full" aria-label="Voir la fiche">
          <Animation ex={ex} />
        </button>
        <p className="text-3xl font-bold tabular-nums">
          {prevu.reps}
          <span className="text-lg text-ivoire2">{unite}</span>
          {prevu.charge != null && <span className="text-ivoire/85"> · {prevu.charge} kg</span>}
        </p>
        {prevu.note && <p className="text-ivoire/85">{prevu.note}</p>}
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
              <p className="text-ivoire/85">Charge</p>
              <div className="flex flex-wrap gap-2">
                {profil.kettlebells.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCharge(k)}
                    className={`h-12 min-w-16 rounded-xl px-3 font-semibold ${charge === k ? 'bg-dore text-fond' : 'bg-carte2'}`}
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
            className={`min-h-14 w-full rounded-2xl text-lg font-semibold ${douleur ? 'bg-douleur text-white' : 'bg-carte2 text-douleur'}`}
          >
            {douleur ? 'Douleur signalée' : 'Douleur ?'}
          </button>
          {douleur && <p className="text-sm text-douleur">Arrête cet exercice s’il fait mal. Il sera remplacé par une version plus sûre la prochaine fois.</p>}
        </Carte>
      ) : null}

      <Bouton className="w-full" disabled={suivie && rpe == null} onClick={valider}>
        {suivie ? 'Valider la série' : 'Fait'}
      </Bouton>
      {suivie && rpe == null && <p className="text-center text-sm text-ivoire2">Indique ton ressenti pour valider.</p>}
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
          className={`min-h-14 w-full rounded-2xl text-lg font-semibold ${douleur ? 'bg-douleur text-white' : 'bg-carte2 text-douleur'}`}
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
    <Carte className={`space-y-6 py-8 text-center ${i >= 0 && seg.genre === 'course' ? 'bg-sauge/25!' : ''}`}>
      <Pastille>{libelleBloc(seance.plan.course!)}</Pastille>
      {i < 0 ? (
        <>
          <p className="text-ivoire/85">Bip à chaque changement. Rythme où tu peux parler.</p>
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
          <p className={`text-5xl font-black ${seg.genre === 'course' ? 'text-sauge-clair' : 'text-sauge-clair'}`}>{seg.genre === 'course' ? 'COURS' : 'MARCHE'}</p>
          <p className="font-mono text-7xl font-bold tabular-nums">{fmtDuree(compte.reste)}</p>
          {nbBlocs > 1 && (
            <p className="text-ivoire2">
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
