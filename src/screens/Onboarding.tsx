import { useState } from 'react'
import { db } from '../db/db'
import { aujourdhui } from '../db/actions'
import { ajouterJours, jourSemaine, lundiDe } from '../engine/dates'
import type { Jour, Profil } from '../types'
import { Bouton, Carte, Choix, Compteur } from '../components/ui'

const POIDS_KB = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32]
export const JOURS: Array<{ valeur: Jour; label: string }> = [
  { valeur: 1, label: 'Lun' },
  { valeur: 2, label: 'Mar' },
  { valeur: 3, label: 'Mer' },
  { valeur: 4, label: 'Jeu' },
  { valeur: 5, label: 'Ven' },
  { valeur: 6, label: 'Sam' },
  { valeur: 0, label: 'Dim' },
]

// La semaine 1 commence le lundi de cette semaine, ou lundi prochain si on est déjà en fin de semaine.
function lundiDeDepart(iso: string): string {
  const j = jourSemaine(iso)
  return j === 0 || j >= 5 ? ajouterJours(lundiDe(iso), 7) : lundiDe(iso)
}

export function Onboarding() {
  const [etape, setEtape] = useState(0)
  const [poids, setPoids] = useState(80)
  const [cible, setCible] = useState<number | null>(null)
  const [taille, setTaille] = useState(178)
  const [kbs, setKbs] = useState<number[]>([])
  const [jours, setJours] = useState<Jour[]>([2, 4, 6])
  const [barre, setBarre] = useState(false)

  const basculer = <T,>(liste: T[], v: T) => (liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v])

  async function valider() {
    const auj = aujourdhui()
    const profil: Profil = {
      id: 'moi',
      poidsDepart: poids,
      poidsCible: cible ?? undefined,
      tailleCm: taille,
      kettlebells: [...kbs].sort((a, b) => a - b),
      jours,
      feuVertMedical: false,
      barreTraction: barre,
      dateDebut: lundiDeDepart(auj),
      creeLe: auj,
    }
    await db.transaction('rw', db.profil, db.pesees, async () => {
      await db.profil.put(profil)
      await db.pesees.put({ date: auj, kg: poids })
    })
  }

  const etapes = [
    <Carte key="poids" className="space-y-6">
      <h2 className="text-2xl font-bold">Ton poids aujourd’hui</h2>
      <Compteur valeur={poids} onChange={setPoids} pas={0.5} min={40} max={200} suffixe=" kg" />
      <div className="space-y-3">
        <p className="text-zinc-300">Poids cible (facultatif)</p>
        {cible == null ? (
          <Bouton variante="secondaire" onClick={() => setCible(Math.round(poids - 3))}>
            Ajouter une cible
          </Bouton>
        ) : (
          <>
            <Compteur valeur={cible} onChange={setCible} pas={0.5} min={40} max={200} suffixe=" kg" />
            <Bouton variante="fantome" onClick={() => setCible(null)}>
              Pas de cible
            </Bouton>
          </>
        )}
      </div>
    </Carte>,
    <Carte key="taille" className="space-y-6">
      <h2 className="text-2xl font-bold">Ta taille</h2>
      <Compteur valeur={taille} onChange={setTaille} min={140} max={215} suffixe=" cm" />
    </Carte>,
    <Carte key="kb" className="space-y-5">
      <h2 className="text-2xl font-bold">Tes kettlebells</h2>
      <p className="text-zinc-400">Touche tous les poids que tu as. L’app choisit la charge de départ et monte quand tu es prêt.</p>
      <div className="grid grid-cols-4 gap-2">
        {POIDS_KB.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKbs((l) => basculer(l, k))}
            className={`h-14 rounded-xl text-lg font-semibold ${kbs.includes(k) ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800'}`}
          >
            {k} kg
          </button>
        ))}
      </div>
    </Carte>,
    <Carte key="jours" className="space-y-5">
      <h2 className="text-2xl font-bold">Tes jours de séance</h2>
      <p className="text-zinc-400">3 séances de 30 min au réveil. Par défaut mardi (force), jeudi (cardio), samedi (circuit et mobilité).</p>
      <div className="grid grid-cols-7 gap-1.5">
        {JOURS.map((j) => (
          <button
            key={j.valeur}
            type="button"
            onClick={() => setJours((l) => basculer(l, j.valeur))}
            className={`h-14 rounded-xl text-sm font-semibold ${jours.includes(j.valeur) ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800'}`}
          >
            {j.label}
          </button>
        ))}
      </div>
      {jours.length !== 3 && <p className="text-amber-300">Le programme est pensé pour 3 séances par semaine.</p>}
      <div className="space-y-2">
        <p className="text-zinc-300">Une barre de traction ?</p>
        <Choix options={[{ valeur: 'non', label: 'Non' }, { valeur: 'oui', label: 'Oui' }]} valeur={barre ? 'oui' : 'non'} onChange={(v) => setBarre(v === 'oui')} />
      </div>
    </Carte>,
  ]

  const peutContinuer = etape !== 2 || kbs.length > 0
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header>
        <p className="text-sm uppercase tracking-wider text-lime-300">12 semaines · étape {etape + 1} sur {etapes.length}</p>
        <h1 className="mt-1 text-3xl font-bold">On fait connaissance</h1>
      </header>
      {etapes[etape]}
      <div className="mt-auto flex gap-3">
        {etape > 0 && (
          <Bouton variante="secondaire" onClick={() => setEtape(etape - 1)}>
            Retour
          </Bouton>
        )}
        {etape < etapes.length - 1 ? (
          <Bouton className="flex-1" disabled={!peutContinuer} onClick={() => setEtape(etape + 1)}>
            Continuer
          </Bouton>
        ) : (
          <Bouton className="flex-1" disabled={jours.length === 0} onClick={valider}>
            C’est parti
          </Bouton>
        )}
      </div>
      {etape === 2 && kbs.length === 0 && <p className="text-center text-sm text-zinc-400">Choisis au moins une kettlebell.</p>}
    </main>
  )
}
