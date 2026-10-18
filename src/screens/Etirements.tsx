import { useNavigate } from 'react-router-dom'
import { EXERCICES_PAR_ID } from '../data/exercices'
import { ETIREMENTS } from '../data/etirements'
import { Carte } from '../components/ui'
import { Svg } from '../components/ui'

const duree = (p: (typeof ETIREMENTS)[number]) =>
  Math.round(
    p.exercices.reduce((t, x) => {
      const ex = EXERCICES_PAR_ID[x.id]
      const cotes = ex?.unilateral ? 2 : 1
      return t + (x.sec ? x.sec * cotes : (x.reps ?? 8) * 4 * cotes) + 10
    }, 0) / 60,
  )

export function Etirements() {
  const nav = useNavigate()
  return (
    <div className="space-y-4 pt-2">
      <button type="button" onClick={() => nav(-1)} className="inline-flex min-h-11 items-center gap-2 text-ivoire2">
        <span aria-hidden>‹</span> Retour
      </button>
      <header>
        <p className="text-xs font-semibold tracking-widest text-sauge-clair">MOBILITÉ</p>
        <h1 className="text-4xl">Étirements</h1>
        <p className="mt-1 text-ivoire2">Six programmes guidés, tous doux pour les épaules. Chaque exercice a son minuteur.</p>
      </header>
      {ETIREMENTS.map((p) => (
        <button key={p.id} type="button" onClick={() => nav(`/seance/etirement/${p.id}`)} className="block w-full text-left">
          <Carte className="space-y-3 active:bg-carte2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-titre text-2xl leading-tight">{p.nom}</p>
                <p className="text-sm text-sauge-clair">{p.quand}</p>
              </div>
              <span className="shrink-0 rounded-full bg-carte2 px-3 py-1 text-sm tabular-nums text-dore">{duree(p)} min</span>
            </div>
            <p className="text-ivoire/85">{p.description}</p>
            <div className="flex gap-1.5">
              {p.exercices.map((x, i) => {
                const ex = EXERCICES_PAR_ID[x.id]
                return ex ? (
                  <span key={i} className="size-10 rounded-xl bg-carte2 p-1 text-sauge-clair" title={ex.nom}>
                    <Svg code={ex.svg} className="h-full w-full" />
                  </span>
                ) : null
              })}
            </div>
          </Carte>
        </button>
      ))}
    </div>
  )
}
