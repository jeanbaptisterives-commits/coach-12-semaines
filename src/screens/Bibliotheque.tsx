import { useMemo, useState } from 'react'
import { EXERCICES } from '../data/exercices'
import type { Categorie } from '../types'
import { Fiche, Modale } from '../components/Fiche'
import { Svg } from '../components/ui'

const CATEGORIES: Array<{ valeur: Categorie | 'tous'; label: string }> = [
  { valeur: 'tous', label: 'Tous' },
  { valeur: 'kettlebell', label: 'Kettlebell' },
  { valeur: 'poids_du_corps', label: 'Poids du corps' },
  { valeur: 'cardio', label: 'Cardio' },
  { valeur: 'gainage', label: 'Gainage' },
  { valeur: 'mobilite', label: 'Mobilité' },
  { valeur: 'echauffement', label: 'Échauffement' },
  { valeur: 'retour_calme', label: 'Retour au calme' },
]

export function Bibliotheque() {
  const [cat, setCat] = useState<Categorie | 'tous'>('tous')
  const [surEpaules, setSurEpaules] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [fiche, setFiche] = useState<string | null>(null)

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    return EXERCICES.filter(
      (e) =>
        (cat === 'tous' || e.categorie === cat) &&
        (!surEpaules || e.surEpaules) &&
        (!q || `${e.nom} ${e.muscles.join(' ')}`.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(q)),
    ).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [cat, surEpaules, recherche])

  const ex = fiche ? EXERCICES.find((e) => e.id === fiche) : undefined
  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-3xl font-bold">Exercices</h1>
      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Chercher un exercice ou un muscle"
        className="h-14 w-full rounded-2xl bg-zinc-900 px-4 text-lg placeholder:text-zinc-500"
      />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.valeur}
            type="button"
            onClick={() => setCat(c.valeur)}
            className={`min-h-11 shrink-0 rounded-full px-4 font-medium ${cat === c.valeur ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-900 text-zinc-300'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-3 text-zinc-300">
        <input type="checkbox" checked={surEpaules} onChange={(e) => setSurEpaules(e.target.checked)} className="size-6 accent-lime-400" />
        Seulement les exercices sûrs pour les épaules
      </label>
      <p className="text-sm text-zinc-500">{liste.length} exercices</p>
      <ul className="space-y-2">
        {liste.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => setFiche(e.id)} className="flex w-full items-center gap-4 rounded-2xl bg-zinc-900 p-3 text-left active:bg-zinc-800">
              <span className="size-14 shrink-0 rounded-xl bg-zinc-800 p-1.5 text-lime-300">
                <Svg code={e.svg} className="h-full w-full" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{e.nom}</span>
                <span className="block truncate text-sm text-zinc-400">{e.muscles.join(', ')}</span>
              </span>
              {!e.surEpaules && <span className="text-sm text-amber-300">épaules</span>}
            </button>
          </li>
        ))}
      </ul>
      <Modale ouvert={!!ex} titre={ex?.nom ?? ''} onFermer={() => setFiche(null)}>
        {ex && <Fiche ex={ex} />}
      </Modale>
    </div>
  )
}
