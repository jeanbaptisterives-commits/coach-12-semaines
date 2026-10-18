import type { Exercice } from '../types'
import { Pastille, Svg } from './ui'

const MATERIEL: Record<string, string> = {
  kettlebell: 'Kettlebell',
  poids_du_corps: 'Poids du corps',
  tapis: 'Tapis',
  table: 'Table solide',
  barre: 'Barre de traction',
  piscine: 'Piscine',
  velo: 'Vélo',
  chienne: 'Avec la chienne',
}

export function Fiche({ ex }: { ex: Exercice }) {
  return (
    <article className="space-y-5">
      <div className="mx-auto aspect-square w-48 rounded-3xl bg-zinc-800 p-4 text-lime-300">
        <Svg code={ex.svg} className="h-full w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Pastille ton={ex.surEpaules ? 'ok' : 'alerte'}>{ex.surEpaules ? 'Sûr pour les épaules' : 'Épaules : à éviter'}</Pastille>
        {ex.intensite === 'haute' && <Pastille ton="alerte">Haute intensité</Pastille>}
        {ex.materiel.map((m) => (
          <Pastille key={m}>{MATERIEL[m] ?? m}</Pastille>
        ))}
      </div>
      <Bloc titre="Objectif">{ex.objectif}</Bloc>
      <Bloc titre="Muscles">{ex.muscles.join(', ')}</Bloc>
      <Bloc titre="Mise en place">{ex.miseEnPlace}</Bloc>
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">Exécution</h3>
        <ol className="list-decimal space-y-2 pl-5 text-zinc-100">
          {ex.execution.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ol>
      </section>
      <Bloc titre="Respiration">{ex.respiration}</Bloc>
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">Erreurs fréquentes</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-zinc-100">
          {ex.erreurs.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Bloc titre="Plus facile">{ex.plusFacile}</Bloc>
        <Bloc titre="Plus difficile">{ex.plusDifficile}</Bloc>
      </div>
    </article>
  )
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-zinc-400">{titre}</h3>
      <p className="text-zinc-100">{children}</p>
    </section>
  )
}

export function Modale({ ouvert, onFermer, children, titre }: { ouvert: boolean; onFermer: () => void; children: React.ReactNode; titre: string }) {
  if (!ouvert) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950" role="dialog" aria-modal="true" aria-label={titre}>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 className="text-xl font-bold">{titre}</h2>
        <button type="button" onClick={onFermer} className="min-h-12 rounded-xl bg-zinc-800 px-4 font-semibold">
          Fermer
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
    </div>
  )
}
