import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../db/db'
import { aujourdhui } from '../db/actions'
import { ajouterJours } from '../engine/dates'
import { comparerTests, moyenne } from '../engine/stats'
import { distanceTest } from '../engine/tests'
import type { Test } from '../types'
import { Bouton, Carte, Compteur, Titre } from '../components/ui'

export function Tests() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const semaine = Number(params.get('semaine') ?? 0) as Test['semaine']
  const auj = aujourdhui()
  const tests = useLiveQuery(() => db.tests.orderBy('semaine').toArray(), [])
  const journal = useLiveQuery(() => db.journal.where('date').between(ajouterJours(auj, -6), auj, true, true).toArray(), [auj])
  const pesees = useLiveQuery(() => db.pesees.orderBy('date').toArray(), [])
  const [pompes, setPompes] = useState(12)
  const [min, setMin] = useState(semaine === 12 ? 35 : 15)
  const [sec, setSec] = useState(0)
  const [enregistre, setEnregistre] = useState<Test | null>(null)

  if (!tests || !journal || !pesees) return null
  const distance = distanceTest(semaine)
  const energieMoyenne = moyenne(journal.map((j) => j.energie).filter((v): v is number => v != null)) ?? undefined
  const poids = pesees.at(-1)?.kg
  const precedent = [...tests].filter((t) => t.semaine < semaine).at(-1)

  async function enregistrer() {
    const t: Test = { semaine, date: auj, pompesMax: pompes, tempsCourseSec: min * 60 + sec, distanceKm: distance, energieMoyenne, poids }
    const existant = tests!.find((x) => x.semaine === semaine)
    const id = await db.tests.put(existant?.id != null ? { ...t, id: existant.id } : t)
    setEnregistre({ ...t, id: id as number })
  }

  if (enregistre) {
    const comparaison = comparerTests(precedent, enregistre)
    return (
      <div className="space-y-4 pt-2">
        <h1 className="text-3xl font-bold">Test S{semaine} enregistré</h1>
        <Carte className="space-y-3">
          <Titre>{precedent ? `Comparé au test S${precedent.semaine}` : 'Ton point de départ'}</Titre>
          {comparaison.map((c) => (
            <div key={c.libelle} className="flex items-center justify-between gap-3 text-lg">
              <span className="text-zinc-300">{c.libelle}</span>
              <span className={c.mieux === true ? 'font-semibold text-lime-300' : c.mieux === false ? 'text-amber-300' : ''}>{c.texte}</span>
            </div>
          ))}
        </Carte>
        <Bouton className="w-full" onClick={() => nav('/')}>
          Retour
        </Bouton>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-3xl font-bold">Test semaine {semaine}</h1>
      <Carte className="space-y-4">
        <Titre>Pompes max</Titre>
        <p className="text-zinc-400">Après l’échauffement. Corps gainé, poitrine à un poing du sol. Tu t’arrêtes quand la forme casse.</p>
        <Compteur valeur={pompes} onChange={setPompes} max={150} />
      </Carte>
      <Carte className="space-y-4">
        <Titre>Course {distance} km</Titre>
        <p className="text-zinc-400">
          {distance === 5 ? 'Le test final : 5 km à ton allure, sans t’arrêter si possible.' : 'À ton allure. Marcher est permis, note le temps total.'}
        </p>
        <Compteur label="Minutes" valeur={min} onChange={setMin} max={90} />
        <Compteur label="Secondes" valeur={sec} onChange={setSec} pas={5} max={55} />
      </Carte>
      <Carte className="space-y-1 text-zinc-300">
        <p>Énergie moyenne sur 7 jours : {energieMoyenne != null ? `${energieMoyenne}/10` : 'pas encore de check'}</p>
        <p>Poids : {poids != null ? `${poids} kg` : 'pas encore de pesée'}</p>
      </Carte>
      <Bouton className="w-full" onClick={enregistrer}>
        Enregistrer le test
      </Bouton>
    </div>
  )
}

export function Poids() {
  const nav = useNavigate()
  const derniere = useLiveQuery(() => db.pesees.orderBy('date').last(), [])
  const [kg, setKg] = useState<number | null>(null)
  if (derniere === undefined && kg == null) return null
  const valeur = kg ?? derniere?.kg ?? 80
  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-3xl font-bold">Pesée</h1>
      <Carte className="space-y-4">
        <p className="text-zinc-400">Idéalement 1 à 2 fois par semaine, le matin à jeun. La courbe suit la moyenne sur 7 jours.</p>
        <Compteur valeur={valeur} onChange={setKg} pas={0.1} min={40} max={200} suffixe=" kg" />
      </Carte>
      <Bouton
        className="w-full"
        onClick={async () => {
          await db.pesees.put({ date: aujourdhui(), kg: valeur })
          nav('/')
        }}
      >
        Enregistrer
      </Bouton>
    </div>
  )
}
