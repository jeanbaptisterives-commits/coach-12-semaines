import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EXERCICES, EXERCICES_PAR_ID } from '../data/exercices'
import { FAMILLE_PAR_ID, FAMILLES, NOMS_VARIANTES } from '../data/familles'
import { MOUVEMENTS } from '../data/mouvements'
import { ANIMATIONS } from '../data/animations'
import type { Exercice, Famille, Mouvement } from '../types'
import { Fiche } from '../components/Fiche'
import { Svg } from '../components/ui'

const VARIANTES = ['facile', 'moyen', 'difficile'] as const
const sansAccent = (t: string) => t.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

function Retour({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex min-h-11 items-center gap-2 text-ivoire2">
      <span aria-hidden>‹</span> {children}
    </Link>
  )
}

function Vignette({ ex, taille = 'size-16' }: { ex: Exercice; taille?: string }) {
  return (
    <span className={`relative ${taille} shrink-0 rounded-2xl bg-carte2 p-2 text-sauge-clair`}>
      <Svg code={ex.svg} className="h-full w-full" />
      {ANIMATIONS.has(ex.id) && <span className="absolute -right-1 -top-1 rounded-full bg-dore px-1.5 text-[10px] font-bold text-fond">▶</span>}
    </span>
  )
}

// Écran d'entrée : les familles en grandes cartes, ou la liste complète avec recherche.
export function Bibliotheque() {
  const [vue, setVue] = useState<'familles' | 'tous'>('familles')
  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-4xl">Exercices</h1>
      <div className="grid grid-cols-2 rounded-2xl bg-carte p-1">
        {(['familles', 'tous'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVue(v)}
            className={`min-h-11 rounded-xl font-semibold ${vue === v ? 'bg-dore text-fond' : 'text-ivoire2'}`}
          >
            {v === 'familles' ? 'Par famille' : 'Tous les exercices'}
          </button>
        ))}
      </div>
      {vue === 'familles' ? <GrilleFamilles /> : <ListeComplete />}
    </div>
  )
}

function GrilleFamilles() {
  const parFamille = useMemo(() => {
    const m = new Map<Famille, number>()
    for (const e of EXERCICES) if (e.surEpaules) m.set(e.famille, (m.get(e.famille) ?? 0) + 1)
    return m
  }, [])
  const mouvements = (f: Famille) => MOUVEMENTS.filter((m) => m.famille === f).length
  return (
    <div className="grid grid-cols-2 gap-3">
      {FAMILLES.filter((f) => parFamille.get(f.id)).map((f) => {
        const exemple = EXERCICES.find((e) => e.famille === f.id && e.reference) ?? EXERCICES.find((e) => e.famille === f.id && e.surEpaules)
        return (
          <Link
            key={f.id}
            to={`/exercices/f/${f.id}`}
            className="relative flex min-h-36 flex-col justify-between overflow-hidden rounded-3xl p-4 active:scale-[0.98]"
            style={{ background: `linear-gradient(150deg, ${f.teinte}33, ${f.teinte}10)`, boxShadow: `inset 0 0 0 1px ${f.teinte}40` }}
          >
            {exemple && (
              <span className="pointer-events-none absolute -bottom-3 -right-3 size-24 opacity-30" style={{ color: f.teinte }}>
                <Svg code={exemple.svg} className="h-full w-full" />
              </span>
            )}
            <span className="text-xs font-semibold tracking-widest" style={{ color: f.teinte }}>
              {f.court}
            </span>
            <span>
              <span className="block font-titre text-2xl leading-tight">{f.nom}</span>
              <span className="mt-1 block text-xs text-ivoire2">
                {mouvements(f.id) ? `${mouvements(f.id)} mouvement${mouvements(f.id) > 1 ? 's' : ''} · ` : ''}
                {parFamille.get(f.id)} exercices
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function ListeComplete() {
  const [recherche, setRecherche] = useState('')
  const [surEpaules, setSurEpaules] = useState(true)
  const liste = useMemo(() => {
    const q = sansAccent(recherche.trim())
    return EXERCICES.filter(
      (e) =>
        (!surEpaules || e.surEpaules) &&
        (!q || sansAccent(`${e.nom} ${e.muscles.join(' ')} ${(e.musclesPrincipaux ?? []).join(' ')}`).includes(q)),
    ).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [recherche, surEpaules])
  return (
    <div className="space-y-3">
      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Chercher un exercice ou un muscle"
        className="h-14 w-full rounded-2xl bg-carte px-4 text-lg placeholder:text-ivoire3"
      />
      <label className="flex items-center gap-3 text-ivoire/85">
        <input type="checkbox" checked={surEpaules} onChange={(e) => setSurEpaules(e.target.checked)} className="size-6 accent-[#c4a35a]" />
        Seulement les exercices sûrs pour les épaules
      </label>
      <p className="text-sm text-ivoire3">{liste.length} exercices</p>
      <ul className="space-y-2">
        {liste.map((e) => (
          <li key={e.id}>
            <LigneExercice ex={e} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function LigneExercice({ ex }: { ex: Exercice }) {
  const f = FAMILLE_PAR_ID[ex.famille]
  const lien = ex.mouvement ? `/exercices/m/${ex.mouvement}?v=${ex.variante}` : `/exercices/e/${ex.id}`
  return (
    <Link to={lien} className="flex items-center gap-4 rounded-2xl bg-carte p-3 active:bg-carte2">
      <Vignette ex={ex} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{ex.nom}</span>
        <span className="block truncate text-sm text-ivoire2">{(ex.musclesPrincipaux ?? ex.muscles).join(', ')}</span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span className="text-[10px] font-semibold tracking-widest" style={{ color: f?.teinte }}>
          {f?.court}
        </span>
        {ex.variante && <span className="text-xs text-ivoire3">{NOMS_VARIANTES[ex.variante]}</span>}
        {!ex.surEpaules && <span className="text-xs text-alerte">épaules</span>}
      </span>
    </Link>
  )
}

// Une famille : ses mouvements (3 niveaux chacun), puis les exercices isolés.
export function PageFamille() {
  const { famille } = useParams<{ famille: Famille }>()
  const f = famille ? FAMILLE_PAR_ID[famille] : undefined
  if (!f) return <Retour to="/exercices">Exercices</Retour>
  const mouvements = MOUVEMENTS.filter((m) => m.famille === f.id)
  const isoles = EXERCICES.filter((e) => e.famille === f.id && !e.mouvement && e.surEpaules)
  return (
    <div className="space-y-5 pt-2">
      <Retour to="/exercices">Exercices</Retour>
      <header>
        <p className="text-xs font-semibold tracking-widest" style={{ color: f.teinte }}>
          {f.court}
        </p>
        <h1 className="text-4xl">{f.nom}</h1>
        <p className="mt-1 text-ivoire2">{f.phrase}</p>
      </header>
      {mouvements.map((m) => (
        <CarteMouvement key={m.id} m={m} teinte={f.teinte} />
      ))}
      {isoles.length > 0 && (
        <section className="space-y-2">
          <h2 className="pt-2 text-sm font-semibold uppercase tracking-wider text-ivoire2">Autres exercices</h2>
          {isoles.map((e) => (
            <LigneExercice key={e.id} ex={e} />
          ))}
        </section>
      )}
    </div>
  )
}

function CarteMouvement({ m, teinte }: { m: Mouvement; teinte: string }) {
  return (
    <Link to={`/exercices/m/${m.id}`} className="block rounded-3xl bg-carte p-4 active:bg-carte2" style={{ boxShadow: `inset 3px 0 0 ${teinte}` }}>
      <p className="font-titre text-2xl">{m.nom}</p>
      <p className="mt-0.5 text-sm text-ivoire2">{m.description}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {VARIANTES.map((v) => {
          const ex = EXERCICES_PAR_ID[m.variantes[v]]
          return (
            <div key={v} className="flex flex-col items-center gap-1.5 rounded-2xl bg-carte2 p-2 text-center">
              {ex && <Vignette ex={ex} taille="size-14" />}
              <span className="text-[11px] font-semibold tracking-wider" style={{ color: v === 'facile' ? '#a9ba9c' : v === 'moyen' ? '#c4a35a' : '#c98f5e' }}>
                {NOMS_VARIANTES[v].toUpperCase()}
              </span>
              <span className="line-clamp-2 text-xs leading-tight text-ivoire/85">{ex?.nom}</span>
            </div>
          )
        })}
      </div>
    </Link>
  )
}

// Un mouvement : onglets Facile / Moyen / Difficile, animation en tête, muscles, fiche.
export function PageMouvement() {
  const { mouvement } = useParams<{ mouvement: string }>()
  const [params, setParams] = useSearchParams()
  const m = MOUVEMENTS.find((x) => x.id === mouvement)
  if (!m) return <Retour to="/exercices">Exercices</Retour>
  const f = FAMILLE_PAR_ID[m.famille]
  const v = (VARIANTES as readonly string[]).includes(params.get('v') ?? '') ? (params.get('v') as (typeof VARIANTES)[number]) : 'moyen'
  const ex = EXERCICES_PAR_ID[m.variantes[v]]
  return (
    <div className="space-y-5 pt-2">
      <Retour to={`/exercices/f/${m.famille}`}>{f.nom}</Retour>
      <header>
        <p className="text-xs font-semibold tracking-widest" style={{ color: f.teinte }}>
          {f.court}
        </p>
        <h1 className="text-4xl">{m.nom}</h1>
        <p className="mt-1 text-ivoire2">{m.description}</p>
      </header>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-carte p-1" role="tablist">
        {VARIANTES.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === v}
            onClick={() => setParams({ v: k }, { replace: true })}
            className={`min-h-12 rounded-xl text-sm font-semibold ${k === v ? 'bg-dore text-fond' : 'text-ivoire2'}`}
          >
            {NOMS_VARIANTES[k]}
          </button>
        ))}
      </div>
      {ex && (
        <>
          <h2 className="text-2xl font-semibold">{ex.nom}</h2>
          <Fiche ex={ex} />
        </>
      )}
    </div>
  )
}

export function PageExercice() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const ex = id ? EXERCICES_PAR_ID[id] : undefined
  if (!ex) return <Retour to="/exercices">Exercices</Retour>
  return (
    <div className="space-y-5 pt-2">
      <button type="button" onClick={() => nav(-1)} className="inline-flex min-h-11 items-center gap-2 text-ivoire2">
        <span aria-hidden>‹</span> Retour
      </button>
      <h1 className="text-4xl">{ex.nom}</h1>
      <Fiche ex={ex} />
    </div>
  )
}
