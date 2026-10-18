import type { EtatCourse, EtatExercice, Exercice, JournalJour, MessageCoach, MotCoach, Pesee, Profil, Seance, Test } from '../types'
import { ajouterJours } from './dates'

// Le coach : résumé compact des données, consignes données à Claude, et validation stricte de sa réponse
// (rien de dangereux pour les épaules, seulement des charges possédées) avant qu'elle touche la séance.

export interface DonneesCoach {
  profil: Profil
  journal: JournalJour[]
  seances: Seance[]
  etats: EtatExercice[]
  course?: EtatCourse
  pesees: Pesee[]
  tests: Test[]
  lib: Exercice[]
}

const nom = (lib: Exercice[], id: string) => lib.find((e) => e.id === id)?.nom ?? id

export function resumerDonnees(d: DonneesCoach, aujourdhui: string): string {
  const p = d.profil
  const depuis = ajouterJours(aujourdhui, -10)
  const L: string[] = []
  L.push(`AUJOURD'HUI : ${aujourdhui}. Programme : ${p.programme === 'carte' ? 'à la carte (il choisit chaque jour)' : `12 semaines, début ${p.dateDebut}, séances les jours ${p.jours.join(',')} (0 = dimanche)`}.`)
  L.push(`PROFIL : ${p.poidsDepart} kg au départ, cible ${p.poidsCible ?? 'aucune'}, ${p.tailleCm} cm, kettlebells ${p.kettlebells.join('/')} kg, barre ${p.barreTraction ? 'oui' : 'non'}, feu vert médical ${p.feuVertMedical ? 'OUI' : 'NON'}.`)
  L.push('\nJOURNAL (10 derniers jours) :')
  for (const j of d.journal.filter((j) => j.date >= depuis).sort((a, b) => a.date.localeCompare(b.date)))
    L.push(`- ${j.date} : énergie ${j.energie ?? '?'}/10, sommeil ${j.sommeil ?? '?'}/10 ${j.heuresSommeil ?? '?'} h, joints ${j.joints ?? '?'} (${j.mode ?? '-'}), dernier ${j.heureDernier ?? '-'}, joint avant midi ${j.jointMatin == null ? '?' : j.jointMatin ? 'oui' : 'non'}`)
  L.push('\nSÉANCES (10 derniers jours) :')
  for (const s of d.seances.filter((s) => s.date >= depuis && s.terminee).sort((a, b) => a.date.localeCompare(b.date))) {
    L.push(`- ${s.date} ${s.type === 'etirement' ? `étirements (${s.etirement})` : `séance ${s.type}`} (S${s.semaine}), ${Math.round(s.dureeSec / 60)} min, zéro joint avant : ${s.zeroJoint ? 'oui' : 'non'}, allégée : ${s.allegee ? 'oui' : 'non'}`)
    for (const e of s.exercices.filter((e) => e.series.length && e.prevu.series > 1))
      L.push(`    ${nom(d.lib, e.exerciceId)} [${e.exerciceId}] prévu ${e.prevu.series}×${e.prevu.reps}${e.prevu.charge ? ` @${e.prevu.charge}kg` : ''} → ${e.series.map((x) => `${x.reps}${x.charge ? `@${x.charge}` : ''} RPE${x.rpe}${x.douleur ? ' DOULEUR' : ''}`).join(', ')}`)
    if (s.course) L.push(`    Course : RPE ${s.course.rpe}, ${s.course.terminee ? 'terminée' : 'arrêtée'}${s.course.douleur ? ', DOULEUR' : ''}`)
  }
  L.push('\nCIBLES ACTUELLES :')
  for (const e of d.etats) L.push(`- ${nom(d.lib, e.exerciceId)} [${e.exerciceId}] : ${e.series}×${e.repsCible} (fourchette ${e.basReps}-${e.hautReps})${e.charge ? ` @${e.charge}kg` : ''}, échecs ${e.echecs}${e.douleur ? ', DOULEUR signalée' : ''}${e.maitrise ? ', variante maîtrisée' : ''}`)
  if (d.course) L.push(`\nCOURSE : ${d.course.continueMin > 0 ? `${d.course.continueMin} min continues` : `${d.course.blocs} × (${d.course.courseSec} s course + ${d.course.marcheSec} s marche)`}`)
  L.push(`\nPESÉES : ${d.pesees.slice(-6).map((x) => `${x.date} ${x.kg} kg`).join(' · ') || 'aucune'}`)
  L.push(`TESTS : ${d.tests.map((x) => `S${x.semaine} pompes ${x.pompesMax}, ${x.distanceKm} km en ${Math.floor((x.tempsCourseSec ?? 0) / 60)} min`).join(' · ') || 'aucun'}`)
  L.push(`\nEXERCICES UTILISABLES POUR UN REMPLACEMENT (sûrs pour les épaules) : ${d.lib.filter((e) => e.surEpaules && e.intensite !== 'haute').map((e) => e.id).join(', ')}`)
  return L.join('\n')
}

export const PERSONA = `Tu es le coach de JB : préparateur physique expert (kettlebell, course, mobilité), direct, tutoiement, zéro morale, phrases courtes, français parfait, jamais de tiret long.
Programme : 12 semaines de 3 séances de 30 min au réveil (A force kettlebell, B course-marche avec sa chienne, C circuit poids du corps + mobilité), ou à la carte. Objectifs : énergie et mental d'abord, puis muscle et mobilité ; courir 5 km sans galérer, plus de pompes, plus d'énergie au réveil.
Contraintes absolues : épaules fragiles, jamais de mouvement au-dessus de la tête ; fractionné et haute intensité interdits sans feu vert médical ; tu n'es pas médecin (douleur qui dure ou douleur thoracique = voir un médecin, en une phrase, sans dramatiser).
Cannabis : il veut changer de mode (sortir le tabac, passer au vaporisateur, zéro joint avant les séances), pas forcément arrêter. Constat chiffré possible, jamais de morale.
L'app ajuste déjà seule les séances (double progression, séance allégée si forme basse, alternative après douleur, montée de variante). Tu interviens quand tu vois ce qu'elle ne voit pas, ou quand JB te le demande.`

const FORMAT_CONSIGNES = `"seance": { "alleger": true } ou { "durcir": true } ou { "remplacer": [{"de": "id", "par": "id utilisable"}] } ou {},
  "reglages": { "charges": {"id": kg}, "repsCible": {"id": n}, "course": {"courseSec": n, "marcheSec": n, "blocs": n, "continueMin": n} } ou {}`

export function promptMatin(resume: string): string {
  return `${PERSONA}

Il vient de faire son check du matin. Voici ses données :
${resume}

Donne-lui le mot du jour : 2 ou 3 phrases concrètes, avec un chiffre tiré de ses données quand c'est possible (sommeil, énergie, conso, progrès). Si sa forme ou ses données le justifient, ajuste la séance du jour.
Réponds UNIQUEMENT par un objet JSON :
{
  "message": "le mot du jour",
  "raison": "une phrase, seulement si tu ajustes la séance",
  ${FORMAT_CONSIGNES}
}
Par défaut seance et reglages sont vides.`
}

export function promptApresSeance(resume: string): string {
  return `${PERSONA}

Il vient de finir sa séance (la plus récente dans les données). Voici ses données :
${resume}

Fais-lui un retour de coach en 2 ou 3 phrases : ce qui était bien (un chiffre), un point technique ou de récupération pour la prochaine fois, adapté à ses ressentis (RPE, douleur, durée). Réponds UNIQUEMENT par un objet JSON : { "message": "ton retour" }`
}

export function promptConversation(resume: string, fil: MessageCoach[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  const contexte = `${PERSONA}

Ses données, à jour :
${resume}

Il te parle dans l'app. Réponds comme son coach : concret, adapté à ses données et à ce qu'il dit (envie, fatigue, douleur, motivation, question technique). 2 à 6 phrases. Si sa demande le justifie (envie d'autre chose, fatigue, douleur, demande d'ajustement), tu peux ajuster la séance du jour ou les réglages.
Réponds UNIQUEMENT par un objet JSON :
{
  "reponse": "ta réponse",
  "raison": "une phrase, seulement si tu ajustes",
  ${FORMAT_CONSIGNES}
}`
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [{ role: 'user', content: contexte }, { role: 'assistant', content: '{"reponse": "Je t\'écoute."}' }]
  for (const m of fil.slice(-12)) messages.push({ role: m.role === 'moi' ? 'user' : 'assistant', content: m.role === 'moi' ? m.texte : JSON.stringify({ reponse: m.texte }) })
  return messages
}

const propre = (t: unknown) => String(t ?? '').replace(/—/g, ',').trim()

// Ne garde de la réponse que ce qui est sûr et applicable. Tout le reste est ignoré sans bruit.
export function validerConsignes(brut: unknown, d: Pick<DonneesCoach, 'lib' | 'profil'>, date: string, champTexte: 'message' | 'reponse' = 'message'): MotCoach | null {
  const c = (brut ?? {}) as Record<string, unknown>
  const texte = propre(c[champTexte])
  if (texte.length < 2) return null
  const lib = Object.fromEntries(d.lib.map((e) => [e.id, e]))
  const sur = (id: string) => !!lib[id] && lib[id].surEpaules && lib[id].intensite !== 'haute' && (!lib[id].materiel.includes('barre') || d.profil.barreTraction)
  const sortie: MotCoach = { date, message: texte }
  if (c.raison) sortie.raison = propre(c.raison)
  const s = (c.seance ?? {}) as Record<string, unknown>
  const seance: NonNullable<MotCoach['seance']> = {}
  if (s.alleger === true) seance.alleger = true
  else if (s.durcir === true) seance.durcir = true
  const remplacer = (Array.isArray(s.remplacer) ? s.remplacer : []).filter(
    (r): r is { de: string; par: string } => !!r && typeof r.de === 'string' && typeof r.par === 'string' && !!lib[r.de] && sur(r.par),
  )
  if (remplacer.length) seance.remplacer = remplacer.map((r) => ({ de: r.de, par: r.par }))
  if (Object.keys(seance).length) sortie.seance = seance
  const g = (c.reglages ?? {}) as Record<string, unknown>
  const reglages: NonNullable<MotCoach['reglages']> = {}
  const charges = Object.fromEntries(
    Object.entries((g.charges ?? {}) as Record<string, unknown>).filter(([id, kg]) => lib[id]?.chargeable && typeof kg === 'number' && d.profil.kettlebells.includes(kg)),
  ) as Record<string, number>
  if (Object.keys(charges).length) reglages.charges = charges
  const reps = Object.fromEntries(
    Object.entries((g.repsCible ?? {}) as Record<string, unknown>).filter(([id, n]) => lib[id] && Number.isInteger(n) && (n as number) > 0 && (n as number) <= 120),
  ) as Record<string, number>
  if (Object.keys(reps).length) reglages.repsCible = reps
  const co = g.course as Record<string, unknown> | undefined
  if (co) {
    const v = [co.courseSec, co.marcheSec, co.blocs, co.continueMin]
    if (v.every((x) => Number.isInteger(x) && (x as number) >= 0) && (co.courseSec as number) <= 900 && (co.continueMin as number) <= 25 && (co.blocs as number) <= 12)
      reglages.course = { courseSec: co.courseSec as number, marcheSec: co.marcheSec as number, blocs: co.blocs as number, continueMin: co.continueMin as number }
  }
  if (Object.keys(reglages).length) sortie.reglages = reglages
  return sortie
}
