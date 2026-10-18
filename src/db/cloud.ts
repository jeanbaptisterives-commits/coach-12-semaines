import { isoLocal } from '../engine/dates'
import type { MessageCoach, MotCoach } from '../types'
import { db, importer, TABLES, type BaseCoach } from './db'

// Version artefact Claude : les données vivent dans la base de l'artefact (capacité `db`), lisible par
// Claude. Le navigateur garde une copie locale (Dexie) pour que l'app reste rapide ; la base fait foi.
// Chaque ligne locale = un document : seances/<id>, journal/<date>, etats/<exerciceId>, profil/moi…

type Table = (typeof TABLES)[number]
type Snap = { exists: boolean; data(): Record<string, unknown> | undefined }
type DocRef = { get(): Promise<Snap>; set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void>; onSnapshot(n: (s: Snap) => void, e?: (x: unknown) => void): () => void }
type BaseArtefact = {
  doc(path: string): DocRef
  collection(path: string): { doc(id: string): DocRef; get(): Promise<{ docs: Snap[] }> }
}

let cdb: BaseArtefact | null = null
let importEnCours = false
const sales = new Map<string, { table: Table; cle: string }>()
let minuteur: ReturnType<typeof setTimeout> | undefined
let ecriture: Promise<void> = Promise.resolve()

export const enArtefact = () => typeof window !== 'undefined' && typeof (window as unknown as { claude?: { use?: unknown } }).claude?.use === 'function'
export const cloudActif = () => cdb !== null

async function utiliser<T>(nom: string): Promise<T | null> {
  try {
    return (await (window as unknown as { claude: { use(n: string): Promise<T | null> } }).claude.use(nom)) ?? null
  } catch {
    return null
  }
}

const propre = (o: unknown) => JSON.parse(JSON.stringify(o)) as Record<string, unknown>

async function lireTout(): Promise<Record<Table, unknown[]>> {
  const res = {} as Record<Table, unknown[]>
  for (const t of TABLES) {
    const snap = await cdb!.collection(t).get()
    res[t] = snap.docs.filter((d) => d.exists).map((d) => d.data())
  }
  return res
}

async function importerDepuisCloud(base: BaseCoach, donnees: Record<Table, unknown[]>) {
  importEnCours = true
  try {
    await importer({ app: 'coach-12-semaines', version: 1, exporteLe: new Date().toISOString(), donnees }, base)
  } finally {
    importEnCours = false
  }
}

function marquer(table: Table, cle: unknown) {
  if (importEnCours || cdb === null || cle == null) return
  sales.set(`${table}/${String(cle)}`, { table, cle: String(cle) })
  clearTimeout(minuteur)
  minuteur = setTimeout(() => void vider(), 800)
}

// Écritures une par une (règle de la base : une écriture à la fois par document).
async function vider() {
  const lot = [...sales.values()]
  sales.clear()
  ecriture = ecriture.then(async () => {
    for (const { table, cle } of lot) {
      const t = db.table(table)
      const brut = await t.get(table === 'seances' || table === 'tests' ? Number(cle) : cle)
      const ref = cdb!.collection(table).doc(cle)
      try {
        if (brut) await ref.set(propre(brut))
        else await ref.delete()
      } catch {
        sales.set(`${table}/${cle}`, { table, cle }) // on réessaiera à la prochaine saisie
      }
    }
  })
  await ecriture
}

function brancherCrochets(base: BaseCoach) {
  for (const t of TABLES) {
    // Typage Dexie des crochets trop strict pour une boucle sur les tables : on passe par une vue minimale.
    const table = base.table(t) as unknown as {
      hook(nom: 'creating', f: (this: { onsuccess?: (k: unknown) => void }, cle: unknown) => void): void
      hook(nom: 'updating' | 'deleting', f: (a: unknown, b?: unknown) => void): void
    }
    table.hook('creating', function (cle) {
      this.onsuccess = (k) => marquer(t, k ?? cle)
    })
    table.hook('updating', (_mods, cle) => marquer(t, cle))
    table.hook('deleting', (cle) => marquer(t, cle))
  }
}

// Démarrage : base de l'artefact → copie locale. Si la base est vide mais pas la copie locale, on l'envoie.
export async function demarrerCloud(base: BaseCoach = db): Promise<boolean> {
  if (!enArtefact()) return false
  cdb = await utiliser<BaseArtefact>('db')
  if (!cdb) return false
  brancherCrochets(base)
  try {
    const donnees = await lireTout()
    if (donnees.profil.length > 0) await importerDepuisCloud(base, donnees)
    else if ((await base.profil.count()) > 0) for (const t of TABLES) for (const cle of await base.table(t).toCollection().primaryKeys()) marquer(t, cle)
  } catch {
    /* base momentanément indisponible : on travaille sur la copie locale, l'envoi suivra */
  }
  // En revenant sur l'app (autre appareil, ou Claude a écrit), on reprend la version de la base.
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || sales.size > 0) return
    try {
      const donnees = await lireTout()
      if (donnees.profil.length > 0) await importerDepuisCloud(base, donnees)
    } catch {
      /* rien */
    }
  })
  return true
}

// ---------- Coach ----------

export async function lireCoachCloud(): Promise<MotCoach | null> {
  if (!cdb) return null
  try {
    const s = await cdb.doc('coach/jour').get()
    return s.exists ? (s.data() as unknown as MotCoach) : null
  } catch {
    return null
  }
}

export async function ecrireCoachCloud(c: MotCoach): Promise<void> {
  if (!cdb) return
  await cdb.doc('coach/jour').set(propre(c))
}

export function ecouterCoach(f: (c: MotCoach | null) => void): () => void {
  if (!cdb) return () => {}
  return cdb.doc('coach/jour').onSnapshot((s) => f(s.exists ? (s.data() as unknown as MotCoach) : null), () => {})
}

export async function lireConversation(date = isoLocal(new Date())): Promise<MessageCoach[]> {
  if (!cdb) return []
  try {
    const s = await cdb.doc(`conversations/${date}`).get()
    return s.exists ? (((s.data() as { messages?: MessageCoach[] }).messages ?? []) as MessageCoach[]) : []
  } catch {
    return []
  }
}

export async function ecrireConversation(messages: MessageCoach[], date = isoLocal(new Date())): Promise<void> {
  if (!cdb) return
  await cdb.doc(`conversations/${date}`).set({ date, messages: propre(messages.slice(-60)) as unknown as MessageCoach[] })
}

// ---------- Claude dans la page (capacité `sample`) ----------

type Sample = { json(input: unknown, opts?: Record<string, unknown>): Promise<unknown> }
let sampleP: Promise<Sample | null> | null = null
export function coachDisponible(): Promise<Sample | null> {
  if (!enArtefact()) return Promise.resolve(null)
  sampleP ??= utiliser<Sample>('sample')
  return sampleP
}

// ---------- Export (capacité `downloads`) ----------

type Downloads = { save(f: { filename: string; data: Blob | string }): Promise<unknown> }
export async function telechargerCloud(filename: string, data: string): Promise<boolean> {
  const d = await utiliser<Downloads>('downloads')
  if (!d) return false
  try {
    await d.save({ filename, data: new Blob([data], { type: 'application/json' }) })
    return true
  } catch {
    return false
  }
}
