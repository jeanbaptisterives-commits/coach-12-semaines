import { useRef, useState } from 'react'
import { db, exporter, importer } from '../db/db'
import { aujourdhui } from '../db/actions'
import type { Jour, Profil } from '../types'
import { Bouton, Carte, Choix, Compteur, Titre } from '../components/ui'
import { JOURS } from './Onboarding'

const POIDS_KB = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32]

export function Reglages({ profil }: { profil: Profil }) {
  const fichier = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const maj = (p: Partial<Profil>) => db.profil.update('moi', p)
  const basculer = <T,>(liste: T[], v: T) => (liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v])

  async function telecharger() {
    const json = JSON.stringify(await exporter(), null, 2)
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `coach-12-semaines-${aujourdhui()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Sauvegarde téléchargée. Range-la dans Fichiers ou iCloud.')
  }

  async function restaurer(f: File) {
    try {
      const json = JSON.parse(await f.text())
      if (!confirm('Remplacer toutes les données de l’app par cette sauvegarde ?')) return
      await importer(json)
      setMessage('Sauvegarde restaurée.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Fichier illisible.')
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-3xl font-bold">Réglages</h1>

      <Carte className="space-y-4">
        <Titre>Feu vert médical</Titre>
        <p className="text-zinc-300">
          Le fractionné, les sauts et le travail à haute intensité restent verrouillés tant que tu n’as pas fait un ECG et un bilan sanguin.
        </p>
        <label className="flex min-h-14 items-center gap-4">
          <input
            type="checkbox"
            checked={profil.feuVertMedical}
            onChange={(e) => {
              if (e.target.checked && !confirm('Tu confirmes avoir fait l’ECG et le bilan sanguin, et que ton médecin est d’accord ?')) return
              maj({ feuVertMedical: e.target.checked })
            }}
            className="size-7 accent-lime-400"
          />
          <span className="text-lg">ECG et bilan sanguin faits, feu vert</span>
        </label>
      </Carte>

      <Carte className="space-y-3">
        <Titre>Jours de séance</Titre>
        <div className="grid grid-cols-7 gap-1.5">
          {JOURS.map((j) => (
            <button
              key={j.valeur}
              type="button"
              onClick={() => maj({ jours: basculer<Jour>(profil.jours, j.valeur) })}
              className={`h-14 rounded-xl text-sm font-semibold ${profil.jours.includes(j.valeur) ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800'}`}
            >
              {j.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-zinc-400">Dans l’ordre de la semaine : force, puis cardio, puis circuit et mobilité.</p>
      </Carte>

      <Carte className="space-y-3">
        <Titre>Matériel</Titre>
        <div className="grid grid-cols-4 gap-2">
          {POIDS_KB.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => maj({ kettlebells: basculer(profil.kettlebells, k).sort((a, b) => a - b) })}
              className={`h-12 rounded-xl font-semibold ${profil.kettlebells.includes(k) ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800'}`}
            >
              {k} kg
            </button>
          ))}
        </div>
        <p className="pt-2 text-zinc-300">Barre de traction</p>
        <Choix
          options={[{ valeur: 'non', label: 'Non' }, { valeur: 'oui', label: 'Oui' }]}
          valeur={profil.barreTraction ? 'oui' : 'non'}
          onChange={(v) => maj({ barreTraction: v === 'oui' })}
        />
      </Carte>

      <Carte className="space-y-3">
        <Titre>Poids cible</Titre>
        {profil.poidsCible != null ? (
          <>
            <Compteur valeur={profil.poidsCible} onChange={(v) => maj({ poidsCible: v })} pas={0.5} min={40} max={200} suffixe=" kg" />
            <Bouton variante="fantome" onClick={() => maj({ poidsCible: undefined })}>
              Retirer la cible
            </Bouton>
          </>
        ) : (
          <Bouton variante="secondaire" onClick={() => maj({ poidsCible: Math.round(profil.poidsDepart - 3) })}>
            Ajouter une cible
          </Bouton>
        )}
      </Carte>

      <Carte className="space-y-3">
        <Titre>Sauvegarde</Titre>
        <p className="text-zinc-300">Tes données ne quittent jamais ton téléphone. Exporte une sauvegarde de temps en temps.</p>
        <Bouton className="w-full" onClick={telecharger}>
          Exporter mes données (JSON)
        </Bouton>
        <Bouton variante="secondaire" className="w-full" onClick={() => fichier.current?.click()}>
          Importer une sauvegarde
        </Bouton>
        <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && restaurer(e.target.files[0])} />
        {message && <p className="text-lime-300">{message}</p>}
      </Carte>

      <p className="px-2 text-center text-xs text-zinc-600">Début du programme : semaine du {profil.dateDebut.split('-').reverse().join('/')}</p>
    </div>
  )
}
