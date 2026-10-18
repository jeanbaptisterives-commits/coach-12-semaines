import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EXERCICES_PAR_ID } from '../data/exercices'
import { db } from '../db/db'
import { aujourdhui } from '../db/actions'
import { lundiDe } from '../engine/dates'
import { serieReguliere } from '../engine/planning'
import { bilanHebdo, comparerTests, liensConsoEnergie, moyenneMobile7 } from '../engine/stats'
import { victoires } from '../engine/victoires'
import type { Profil, Seance } from '../types'
import { Carte, Titre } from '../components/ui'

const AXE = { stroke: '#71717a', fontSize: 12 }
const INFOBULLE = { contentStyle: { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }, labelStyle: { color: '#a1a1aa' } }
const court = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

function Graphe({ titre, children, vide }: { titre: string; children: React.ReactElement; vide: boolean }) {
  return (
    <Carte>
      <Titre>{titre}</Titre>
      {vide ? (
        <p className="py-6 text-center text-zinc-500">Pas encore assez de données.</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </Carte>
  )
}

function volumeSeance(s: Seance): number {
  // Volume = reps × charge (le poids du corps compte pour 1 kg par rep, la durée pour 1 par 5 s).
  return s.exercices.reduce((t, e) => {
    const ex = EXERCICES_PAR_ID[e.exerciceId]
    return t + e.series.reduce((u, x) => u + (ex?.mesure === 'duree' ? x.reps / 5 : x.reps) * (x.charge ?? 1), 0)
  }, 0)
}

export function Progres({ profil }: { profil: Profil }) {
  const auj = aujourdhui()
  const journal = useLiveQuery(() => db.journal.orderBy('date').toArray(), [])
  const seances = useLiveQuery(() => db.seances.orderBy('date').toArray(), [])
  const pesees = useLiveQuery(() => db.pesees.orderBy('date').toArray(), [])
  const tests = useLiveQuery(() => db.tests.orderBy('semaine').toArray(), [])
  if (!journal || !seances || !pesees || !tests) return null

  const faites = seances.filter((s) => s.terminee)
  const poids = moyenneMobile7(pesees).map((p) => ({ date: court(p.date), kg: p.kg, moyenne: p.moyenne7 }))
  const energie = journal.filter((j) => j.energie != null).map((j) => ({ date: court(j.date), energie: j.energie, sommeil: j.sommeil }))
  const conso = journal
    .filter((j) => j.joints != null)
    .map((j) => ({
      date: court(j.date),
      tabac: j.mode === 'joint_tabac' ? j.joints : 0,
      pur: j.mode === 'joint_pur' ? j.joints : 0,
      vapo: j.mode === 'vaporisateur' ? j.joints : 0,
    }))
  const parSemaine = new Map<string, number>()
  for (const s of faites) parSemaine.set(lundiDe(s.date), (parSemaine.get(lundiDe(s.date)) ?? 0) + volumeSeance(s))
  const volume = [...parSemaine.entries()].map(([l, v]) => ({ date: court(l), volume: Math.round(v) }))
  const pompes = faites
    .map((s) => ({ date: court(s.date), max: Math.max(0, ...(s.exercices.find((e) => e.exerciceId === 'pompes')?.series.map((x) => x.reps) ?? [])) }))
    .filter((p) => p.max > 0)
  const course = faites
    .filter((s) => s.type === 'B' && s.plan.course)
    .map((s) => {
      const c = s.plan.course!
      const min = c.continueMin > 0 ? c.continueMin : (c.blocs * c.courseSec) / 60
      return { date: court(s.date), course: Math.round(min * 10) / 10 }
    })
  const liens = liensConsoEnergie(journal)
  const bilan = bilanHebdo(profil, seances, journal, auj, victoires(seances.filter((s) => s.date >= lundiDe(auj)), journal, 0).map((v) => v.texte))
  const listeVictoires = victoires(seances, journal, serieReguliere(profil, seances, auj)).slice(0, 6)

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-3xl font-bold">Progrès</h1>

      <Carte className="space-y-3">
        <Titre>Bilan de la semaine</Titre>
        <p className="text-2xl font-bold">
          {bilan.prevues > 0 ? `${bilan.faites}/${bilan.prevues} séances` : `${bilan.faites} séance${bilan.faites > 1 ? 's' : ''} avant le démarrage`}
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <p className="text-zinc-400">
            Énergie au réveil
            <br />
            <span className="text-lg text-zinc-100">
              {bilan.energie ?? '?'}/10{bilan.energiePrecedente != null && <span className="text-zinc-500"> (avant {bilan.energiePrecedente})</span>}
            </span>
          </p>
          <p className="text-zinc-400">
            Joints par jour
            <br />
            <span className="text-lg text-zinc-100">
              {bilan.joints ?? '?'}
              {bilan.jointsPrecedents != null && <span className="text-zinc-500"> (avant {bilan.jointsPrecedents})</span>}
            </span>
          </p>
        </div>
        <p>
          <span className="font-semibold text-lime-300">Victoire :</span> {bilan.victoire}
        </p>
        <p>
          <span className="font-semibold text-amber-300">À travailler :</span> {bilan.aTravailler}
        </p>
      </Carte>

      <Carte className="space-y-3">
        <Titre>Conso, sommeil, énergie</Titre>
        <Lien libelle="Énergie au réveil, jours avec joint le matin" a={liens.energieAvecJointMatin} b={liens.energieSansJointMatin} libelleB="sans" />
        <Lien libelle="Énergie après une veille à 4 joints ou plus" a={liens.energieApresVeilleChargee} b={liens.energieApresVeilleLegere} libelleB="à 2 ou moins" />
        <Lien libelle="Sommeil après une veille à 4 joints ou plus" a={liens.sommeilApresVeilleChargee} b={liens.sommeilApresVeilleLegere} libelleB="à 2 ou moins" />
        <p className="text-xs text-zinc-500">Moyennes sur tout ton journal. Plus tu remplis le check, plus c’est parlant.</p>
      </Carte>

      <Graphe titre="Poids (moyenne 7 jours)" vide={poids.length < 2}>
        <LineChart data={poids}>
          <CartesianGrid stroke="#27272a" />
          <XAxis dataKey="date" {...AXE} />
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} {...AXE} width={36} />
          <Tooltip {...INFOBULLE} />
          {profil.poidsCible && <ReferenceLine y={profil.poidsCible} stroke="#a3e635" strokeDasharray="4 4" />}
          <Line dataKey="kg" stroke="#52525b" dot={{ r: 3 }} name="pesée" />
          <Line dataKey="moyenne" stroke="#a3e635" strokeWidth={3} dot={false} name="moyenne 7 j" />
        </LineChart>
      </Graphe>

      <Graphe titre="Énergie au réveil et sommeil" vide={energie.length < 2}>
        <LineChart data={energie}>
          <CartesianGrid stroke="#27272a" />
          <XAxis dataKey="date" {...AXE} />
          <YAxis domain={[0, 10]} {...AXE} width={28} />
          <Tooltip {...INFOBULLE} />
          <Legend />
          <Line dataKey="energie" stroke="#a3e635" strokeWidth={3} name="énergie" />
          <Line dataKey="sommeil" stroke="#38bdf8" strokeWidth={2} name="sommeil" />
        </LineChart>
      </Graphe>

      <Graphe titre="Joints par jour" vide={conso.length < 2}>
        <BarChart data={conso}>
          <CartesianGrid stroke="#27272a" />
          <XAxis dataKey="date" {...AXE} />
          <YAxis allowDecimals={false} {...AXE} width={28} />
          <Tooltip {...INFOBULLE} />
          <Legend />
          <Bar dataKey="tabac" stackId="c" fill="#f59e0b" name="avec tabac" />
          <Bar dataKey="pur" stackId="c" fill="#a3e635" name="pur" />
          <Bar dataKey="vapo" stackId="c" fill="#38bdf8" name="vaporisateur" />
        </BarChart>
      </Graphe>

      <Graphe titre="Volume d’entraînement par semaine" vide={volume.length < 1}>
        <BarChart data={volume}>
          <CartesianGrid stroke="#27272a" />
          <XAxis dataKey="date" {...AXE} />
          <YAxis {...AXE} width={44} />
          <Tooltip {...INFOBULLE} />
          <Bar dataKey="volume" fill="#a3e635" name="volume" />
        </BarChart>
      </Graphe>

      <Graphe titre="Pompes : meilleure série" vide={pompes.length < 2}>
        <LineChart data={pompes}>
          <CartesianGrid stroke="#27272a" />
          <XAxis dataKey="date" {...AXE} />
          <YAxis allowDecimals={false} {...AXE} width={28} />
          <Tooltip {...INFOBULLE} />
          <Line dataKey="max" stroke="#a3e635" strokeWidth={3} name="pompes" />
        </LineChart>
      </Graphe>

      <Graphe titre="Course : minutes courues par séance" vide={course.length < 2}>
        <LineChart data={course}>
          <CartesianGrid stroke="#27272a" />
          <XAxis dataKey="date" {...AXE} />
          <YAxis {...AXE} width={28} />
          <Tooltip {...INFOBULLE} />
          <Line dataKey="course" stroke="#38bdf8" strokeWidth={3} name="minutes" />
        </LineChart>
      </Graphe>

      <Carte className="space-y-3">
        <Titre>Tests</Titre>
        {tests.length === 0 && <p className="text-zinc-400">Aucun test pour l’instant.</p>}
        {tests.map((t, i) => (
          <div key={t.id} className="border-t border-zinc-800 pt-3 first:border-0 first:pt-0">
            <p className="font-semibold">Semaine {t.semaine}</p>
            {comparerTests(tests[i - 1], t).map((c) => (
              <p key={c.libelle} className="flex justify-between text-sm">
                <span className="text-zinc-400">{c.libelle}</span>
                <span className={c.mieux ? 'text-lime-300' : ''}>{c.texte}</span>
              </p>
            ))}
          </div>
        ))}
        <Link to="/tests?semaine=0" className="inline-block text-sm text-zinc-400 underline underline-offset-4">
          Refaire le test de départ
        </Link>
      </Carte>

      {listeVictoires.length > 0 && (
        <Carte>
          <Titre>Victoires</Titre>
          <ul className="space-y-2">
            {listeVictoires.map((v) => (
              <li key={v.date + v.texte} className="flex justify-between gap-3">
                <span className="text-lime-300">{v.texte}</span>
                <span className="text-sm text-zinc-500">{court(v.date)}</span>
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </div>
  )
}

function Lien({ libelle, a, b, libelleB }: { libelle: string; a: number | null; b: number | null; libelleB: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-zinc-300">{libelle}</span>
      <span className="shrink-0 tabular-nums">
        {a ?? '?'} <span className="text-zinc-500">vs {libelleB}</span> {b ?? '?'}
      </span>
    </div>
  )
}
