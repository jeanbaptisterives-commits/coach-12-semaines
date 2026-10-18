import { useRef, useState } from 'react'
import { db, exporter, importer } from '../db/db'
import { enArtefact, telechargerCloud } from '../db/cloud'
import { aujourdhui } from '../db/actions'
import type { Jour, Profil } from '../types'
import { Bouton, Carte, Choix, Compteur, Titre } from '../components/ui'
import { JOURS } from './Onboarding'

const POIDS_KB = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32]

export function Reglages({ profil }: { profil: Profil }) {
  const fichier = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [aImporter, setAImporter] = useState<unknown>(null)
  const [confirmerFeuVert, setConfirmerFeuVert] = useState(false)
  const maj = (p: Partial<Profil>) => db.profil.update('moi', p)
  const basculer = <T,>(liste: T[], v: T) => (liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v])

  async function telecharger() {
    const json = JSON.stringify(await exporter(), null, 2)
    if (enArtefact()) {
      setMessage((await telechargerCloud(`coach-12-semaines-${aujourdhui()}.json`, json)) ? 'Sauvegarde enregistrée.' : 'Sauvegarde annulée.')
      return
    }
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
      setAImporter(JSON.parse(await f.text()))
      setMessage('')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Fichier illisible.')
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-3xl font-bold">Réglages</h1>

      <Carte className="space-y-3">
        <Titre>Programme</Titre>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: '12semaines', nom: '12 semaines', detail: '3 séances guidées par semaine, tests aux semaines 4, 8 et 12' },
            { id: 'carte', nom: 'À la carte', detail: 'Rien d’imposé : tu choisis chaque jour selon ton envie' },
          ] as const).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => maj({ programme: p.id })}
              className={`rounded-2xl p-3 text-left ${(profil.programme ?? '12semaines') === p.id ? 'bg-dore text-fond' : 'bg-carte2'}`}
            >
              <span className="block font-semibold">{p.nom}</span>
              <span className={`block text-xs ${(profil.programme ?? '12semaines') === p.id ? 'text-fond/80' : 'text-ivoire2'}`}>{p.detail}</span>
            </button>
          ))}
        </div>
      </Carte>

      <Carte className="space-y-4">
        <Titre>Feu vert médical</Titre>
        <p className="text-ivoire/85">
          Le fractionné, les sauts et le travail à haute intensité restent verrouillés tant que tu n’as pas fait un ECG et un bilan sanguin.
        </p>
        <label className="flex min-h-14 items-center gap-4">
          <input
            type="checkbox"
            checked={profil.feuVertMedical}
            onChange={(e) => {
              if (e.target.checked) setConfirmerFeuVert(true)
              else maj({ feuVertMedical: false })
            }}
            className="size-7 accent-[#c4a35a]"
          />
          <span className="text-lg">ECG et bilan sanguin faits, feu vert</span>
        </label>
        {confirmerFeuVert && !profil.feuVertMedical && (
          <div className="space-y-3 rounded-2xl bg-carte2 p-4">
            <p>Tu confirmes avoir fait l’ECG et le bilan sanguin, et que ton médecin est d’accord ?</p>
            <div className="flex gap-2">
              <Bouton className="flex-1 text-base" onClick={() => { maj({ feuVertMedical: true }); setConfirmerFeuVert(false) }}>
                Oui, c’est fait
              </Bouton>
              <Bouton variante="secondaire" className="flex-1 text-base" onClick={() => setConfirmerFeuVert(false)}>
                Pas encore
              </Bouton>
            </div>
          </div>
        )}
      </Carte>

      <Carte className="space-y-3">
        <Titre>Jours de séance</Titre>
        <div className="grid grid-cols-7 gap-1.5">
          {JOURS.map((j) => (
            <button
              key={j.valeur}
              type="button"
              onClick={() => maj({ jours: basculer<Jour>(profil.jours, j.valeur) })}
              className={`h-14 rounded-xl text-sm font-semibold ${profil.jours.includes(j.valeur) ? 'bg-dore text-fond' : 'bg-carte2'}`}
            >
              {j.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-ivoire2">Dans l’ordre de la semaine : force, puis cardio, puis circuit et mobilité.</p>
      </Carte>

      <Carte className="space-y-3">
        <Titre>Matériel</Titre>
        <div className="grid grid-cols-4 gap-2">
          {POIDS_KB.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => maj({ kettlebells: basculer(profil.kettlebells, k).sort((a, b) => a - b) })}
              className={`h-12 rounded-xl font-semibold ${profil.kettlebells.includes(k) ? 'bg-dore text-fond' : 'bg-carte2'}`}
            >
              {k} kg
            </button>
          ))}
        </div>
        <p className="pt-2 text-ivoire/85">Barre de traction</p>
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
        <p className="text-ivoire/85">Tes données ne quittent jamais ton téléphone. Exporte une sauvegarde de temps en temps.</p>
        <Bouton className="w-full" onClick={telecharger}>
          Exporter mes données (JSON)
        </Bouton>
        <Bouton variante="secondaire" className="w-full" onClick={() => fichier.current?.click()}>
          Importer une sauvegarde
        </Bouton>
        <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && restaurer(e.target.files[0])} />
        {aImporter != null && (
          <div className="space-y-3 rounded-2xl bg-carte2 p-4">
            <p>Remplacer toutes les données de l’app par cette sauvegarde ?</p>
            <div className="flex gap-2">
              <Bouton
                variante="danger"
                className="flex-1 text-base"
                onClick={async () => {
                  try {
                    await importer(aImporter)
                    setMessage('Sauvegarde restaurée.')
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : 'Fichier illisible.')
                  }
                  setAImporter(null)
                }}
              >
                Remplacer
              </Bouton>
              <Bouton variante="secondaire" className="flex-1 text-base" onClick={() => setAImporter(null)}>
                Annuler
              </Bouton>
            </div>
          </div>
        )}
        {message && <p className="text-sauge-clair">{message}</p>}
      </Carte>

      <p className="px-2 text-center text-xs text-ivoire3">Début du programme : semaine du {profil.dateDebut.split('-').reverse().join('/')}</p>
    </div>
  )
}
