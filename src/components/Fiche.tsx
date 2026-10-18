import { FAMILLE_PAR_ID } from '../data/familles'
import type { Exercice } from '../types'
import { Animation } from './Animation'
import { Pastille } from './ui'

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
  const principaux = ex.musclesPrincipaux ?? ex.muscles.slice(0, 2)
  const secondaires = ex.musclesSecondaires ?? ex.muscles.slice(2)
  const teinte = FAMILLE_PAR_ID[ex.famille]?.teinte ?? '#7a8b6f'
  return (
    <article className="space-y-6">
      <Animation ex={ex} />
      <div className="flex flex-wrap gap-2">
        <Pastille ton={ex.surEpaules ? 'ok' : 'alerte'}>{ex.surEpaules ? 'Sûr pour les épaules' : 'Épaules : à éviter'}</Pastille>
        {ex.intensite === 'haute' && <Pastille ton="alerte">Haute intensité</Pastille>}
        {ex.materiel.map((m) => (
          <Pastille key={m}>{MATERIEL[m] ?? m}</Pastille>
        ))}
      </div>

      <section className="rounded-3xl bg-carte p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ivoire2">Muscles</h3>
        <div className="flex flex-wrap gap-2">
          {principaux.map((m) => (
            <span key={m} className="rounded-full px-3 py-1.5 text-sm font-semibold text-fond" style={{ background: teinte }}>
              {m}
            </span>
          ))}
          {secondaires.map((m) => (
            <span key={m} className="rounded-full px-3 py-1.5 text-sm text-ivoire/85" style={{ boxShadow: `inset 0 0 0 1.5px ${teinte}80` }}>
              {m}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-ivoire3">Plein : muscles principaux · Contour : muscles secondaires</p>
      </section>

      <Bloc titre="Objectif">{ex.objectif}</Bloc>
      <Bloc titre="Mise en place">{ex.miseEnPlace}</Bloc>
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ivoire2">Exécution</h3>
        <ol className="space-y-3">
          {ex.execution.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-carte2 text-sm font-semibold text-dore">{i + 1}</span>
              <span className="pt-0.5 text-ivoire">{e}</span>
            </li>
          ))}
        </ol>
      </section>
      <Bloc titre="Respiration">{ex.respiration}</Bloc>
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ivoire2">Erreurs fréquentes</h3>
        <ul className="space-y-2">
          {ex.erreurs.map((e, i) => (
            <li key={i} className="flex gap-3 text-ivoire">
              <span className="pt-0.5 text-douleur" aria-hidden>
                ✕
              </span>
              {e}
            </li>
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
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-ivoire2">{titre}</h3>
      <p className="text-ivoire">{children}</p>
    </section>
  )
}

export function Modale({ ouvert, onFermer, children, titre }: { ouvert: boolean; onFermer: () => void; children: React.ReactNode; titre: string }) {
  if (!ouvert) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-fond" role="dialog" aria-modal="true" aria-label={titre}>
      <div className="flex items-center justify-between gap-3 border-b border-ligne px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 className="font-titre text-2xl">{titre}</h2>
        <button type="button" onClick={onFermer} className="min-h-12 rounded-xl bg-carte2 px-4 font-semibold">
          Fermer
        </button>
      </div>
      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
    </div>
  )
}
