// Résumé compact des données pour le coach du matin, et validation de sa réponse.
// node resume.mjs resumer <donnees.json> <AAAA-MM-JJ>        -> texte sur stdout
// node resume.mjs valider <donnees.json> <AAAA-MM-JJ> <reponse> -> JSON du coach validé sur stdout (code 1 si invalide)
import { readFileSync } from 'node:fs'

const [, , action, fichier, aujourdhui, reponse] = process.argv
const d = JSON.parse(readFileSync(fichier, 'utf8'))
const t = d.donnees
const lib = Object.fromEntries((d.bibliotheque ?? []).map((e) => [e.id, e]))
const nom = (id) => lib[id]?.nom ?? id

function decaler(iso, n) {
  const [a, m, j] = iso.split('-').map(Number)
  const x = new Date(a, m - 1, j + n)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

function resumer() {
  const p = t.profil[0] ?? {}
  const depuis = decaler(aujourdhui, -10)
  const lignes = []
  lignes.push(`AUJOURD'HUI : ${aujourdhui}. Début du programme (lundi semaine 1) : ${p.dateDebut}. Jours de séance (0=dim) : ${p.jours?.join(',')}.`)
  lignes.push(`PROFIL : ${p.poidsDepart} kg au départ, cible ${p.poidsCible ?? 'aucune'}, ${p.tailleCm} cm, kettlebells ${p.kettlebells?.join('/')} kg, barre ${p.barreTraction ? 'oui' : 'non'}, feu vert médical ${p.feuVertMedical ? 'OUI' : 'NON'}.`)
  lignes.push('\nJOURNAL (10 derniers jours) :')
  for (const j of t.journal.filter((j) => j.date >= depuis).sort((a, b) => a.date.localeCompare(b.date)))
    lignes.push(`- ${j.date} : énergie ${j.energie ?? '?'}/10, sommeil ${j.sommeil ?? '?'}/10 ${j.heuresSommeil ?? '?'} h, joints ${j.joints ?? '?'} (${j.mode ?? '-'}), dernier ${j.heureDernier ?? '-'}, joint avant midi ${j.jointMatin == null ? '?' : j.jointMatin ? 'oui' : 'non'}`)
  lignes.push('\nSÉANCES (10 derniers jours) :')
  for (const s of t.seances.filter((s) => s.date >= depuis && s.terminee).sort((a, b) => a.date.localeCompare(b.date))) {
    lignes.push(`- ${s.date} séance ${s.type} (S${s.semaine}), ${Math.round(s.dureeSec / 60)} min, zéro joint avant : ${s.zeroJoint ? 'oui' : 'non'}, allégée : ${s.allegee ? 'oui' : 'non'}`)
    for (const e of s.exercices.filter((e) => e.series.length && e.prevu.series > 1))
      lignes.push(`    ${nom(e.exerciceId)} [${e.exerciceId}] prévu ${e.prevu.series}×${e.prevu.reps}${e.prevu.charge ? ` @${e.prevu.charge}kg` : ''} → ${e.series.map((x) => `${x.reps}${x.charge ? `@${x.charge}` : ''} RPE${x.rpe}${x.douleur ? ' DOULEUR' : ''}`).join(', ')}`)
    if (s.course) lignes.push(`    Course : RPE ${s.course.rpe}, ${s.course.terminee ? 'terminée' : 'arrêtée'}${s.course.douleur ? ', DOULEUR' : ''}`)
  }
  lignes.push('\nCIBLES ACTUELLES PAR EXERCICE :')
  for (const e of t.etats) lignes.push(`- ${nom(e.exerciceId)} [${e.exerciceId}] : ${e.series}×${e.repsCible} (fourchette ${e.basReps}-${e.hautReps})${e.charge ? ` @${e.charge}kg` : ''}, échecs ${e.echecs}${e.douleur ? ', DOULEUR signalée' : ''}`)
  const c = t.course[0]
  if (c) lignes.push(`\nCOURSE : ${c.continueMin > 0 ? `${c.continueMin} min continues` : `${c.blocs} × (${c.courseSec}s course + ${c.marcheSec}s marche)`}`)
  lignes.push(`\nPESÉES : ${t.pesees.slice(-6).map((x) => `${x.date} ${x.kg}kg`).join(' · ') || 'aucune'}`)
  lignes.push(`TESTS : ${t.tests.map((x) => `S${x.semaine} pompes ${x.pompesMax}, ${x.distanceKm} km en ${Math.floor(x.tempsCourseSec / 60)}:${String(x.tempsCourseSec % 60).padStart(2, '0')}`).join(' · ') || 'aucun'}`)
  lignes.push(`\nEXERCICES SÛRS POUR LES ÉPAULES (ids utilisables pour un remplacement) : ${Object.values(lib).filter((e) => e.surEpaules && e.intensite !== 'haute').map((e) => e.id).join(', ')}`)
  return lignes.join('\n')
}

function valider() {
  const brut = reponse.trim().replace(/^```(json)?/, '').replace(/```$/, '').trim()
  const c = JSON.parse(brut.slice(brut.indexOf('{'), brut.lastIndexOf('}') + 1))
  if (typeof c.message !== 'string' || c.message.length < 5) throw new Error('message manquant')
  const sortie = { date: aujourdhui, message: c.message.replace(/—/g, ',').trim() }
  if (c.raison) sortie.raison = String(c.raison).replace(/—/g, ',')
  const s = c.seance ?? {}
  const seance = {}
  if (s.alleger === true) seance.alleger = true
  else if (s.durcir === true) seance.durcir = true
  const sur = (id) => lib[id]?.surEpaules && lib[id]?.intensite !== 'haute'
  const remplacer = (s.remplacer ?? []).filter((r) => lib[r.de] && sur(r.par))
  if (remplacer.length) seance.remplacer = remplacer
  if (Object.keys(seance).length) sortie.seance = seance
  const g = c.reglages ?? {}
  const reglages = {}
  const kbs = t.profil[0]?.kettlebells ?? []
  const charges = Object.fromEntries(Object.entries(g.charges ?? {}).filter(([id, kg]) => lib[id]?.chargeable && kbs.includes(kg)))
  if (Object.keys(charges).length) reglages.charges = charges
  const reps = Object.fromEntries(Object.entries(g.repsCible ?? {}).filter(([id, n]) => lib[id] && Number.isInteger(n) && n > 0 && n <= 120))
  if (Object.keys(reps).length) reglages.repsCible = reps
  const co = g.course
  if (co && [co.courseSec, co.marcheSec, co.blocs, co.continueMin].every((v) => Number.isInteger(v) && v >= 0) && co.courseSec <= 900 && co.continueMin <= 25)
    reglages.course = { courseSec: co.courseSec, marcheSec: co.marcheSec, blocs: co.blocs, continueMin: co.continueMin }
  if (Object.keys(reglages).length) sortie.reglages = reglages
  return sortie
}

try {
  if (action === 'resumer') console.log(resumer())
  else if (action === 'valider') console.log(JSON.stringify(valider(), null, 1))
  else throw new Error('action inconnue')
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
