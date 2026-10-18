import { useState } from 'react'
import { db } from '../db/db'
import { ajouterJours } from '../engine/dates'
import type { JournalJour, ModeConso } from '../types'
import { Bouton, Carte, Choix, Compteur, Echelle } from '../components/ui'

export const MODES: Array<{ valeur: ModeConso; label: string }> = [
  { valeur: 'joint_tabac', label: 'Joint + tabac' },
  { valeur: 'joint_pur', label: 'Joint pur' },
  { valeur: 'vaporisateur', label: 'Vaporisateur' },
]

// Moins de 30 secondes : le matin du jour + la conso d'hier.
export function CheckMatin({ date, existant, veille, onFini }: { date: string; existant?: JournalJour; veille?: JournalJour; onFini?: () => void }) {
  const [energie, setEnergie] = useState(existant?.energie)
  const [sommeil, setSommeil] = useState(existant?.sommeil)
  const [heures, setHeures] = useState(existant?.heuresSommeil ?? 7.5)
  const [joints, setJoints] = useState(veille?.joints ?? 3)
  const [mode, setMode] = useState<ModeConso>(veille?.mode ?? 'joint_tabac')
  const [heureDernier, setHeureDernier] = useState(veille?.heureDernier ?? '23:00')
  const [jointMatin, setJointMatin] = useState<boolean | undefined>(veille?.jointMatin)

  async function enregistrer() {
    const hier = ajouterJours(date, -1)
    await db.transaction('rw', db.journal, async () => {
      await db.journal.put({ ...(await db.journal.get(date)), date, energie, sommeil, heuresSommeil: heures })
      await db.journal.put({
        ...(await db.journal.get(hier)),
        date: hier,
        joints,
        mode: joints > 0 ? mode : undefined,
        heureDernier: joints > 0 ? heureDernier : undefined,
        jointMatin: joints > 0 ? jointMatin : false,
      })
    })
    onFini?.()
  }

  return (
    <Carte className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Check du matin</h2>
        <p className="text-sm text-zinc-400">30 secondes. C’est ce qui règle la séance du jour.</p>
      </div>
      <Echelle label="Énergie au réveil" valeur={energie} onChange={setEnergie} />
      <Echelle label="Qualité du sommeil" valeur={sommeil} onChange={setSommeil} />
      <Compteur label="Heures de sommeil" valeur={heures} onChange={setHeures} pas={0.5} min={0} max={14} suffixe=" h" />
      <div className="space-y-4 border-t border-zinc-800 pt-5">
        <p className="font-semibold">Hier</p>
        <Compteur label="Joints" valeur={joints} onChange={setJoints} min={0} max={20} />
        {joints > 0 && (
          <>
            <Choix options={MODES} valeur={mode} onChange={setMode} />
            <label className="flex items-center justify-between text-zinc-300">
              Heure du dernier
              <input
                type="time"
                value={heureDernier}
                onChange={(e) => setHeureDernier(e.target.value)}
                className="h-12 rounded-xl bg-zinc-800 px-3 text-lg text-zinc-100"
              />
            </label>
            <div className="space-y-2">
              <p className="text-zinc-300">Un joint avant midi ?</p>
              <Choix
                options={[{ valeur: 'non', label: 'Non' }, { valeur: 'oui', label: 'Oui' }]}
                valeur={jointMatin == null ? undefined : jointMatin ? 'oui' : 'non'}
                onChange={(v) => setJointMatin(v === 'oui')}
              />
            </div>
          </>
        )}
      </div>
      <Bouton className="w-full" disabled={energie == null || sommeil == null} onClick={enregistrer}>
        Enregistrer
      </Bouton>
    </Carte>
  )
}
