import { EXERCICES, EXERCICES_PAR_ID } from '../data/exercices'
import { etatCourseInitial, progresserCourse } from '../engine/course'
import { ajouterJours, isoLocal, phaseDe, semaineDe } from '../engine/dates'
import { scoreForme } from '../engine/forme'
import { genererSeance, seriesParPhase } from '../engine/generateur'
import { appliquerProgression, etatInitial } from '../engine/progression'
import type { EtatExercice, Profil, Seance, TypeSeance } from '../types'
import { db, type BaseCoach } from './db'
import { chargerCoach, coachDuJour } from './sync'

export const aujourdhui = () => isoLocal(new Date())

export async function chargerProfil(base: BaseCoach = db): Promise<Profil | undefined> {
  return base.profil.get('moi')
}

export async function etatCourse(base: BaseCoach = db) {
  return (await base.course.get('course')) ?? etatCourseInitial()
}

// Prépare la séance du jour (sans l'enregistrer) à partir de tout l'historique.
export async function preparerSeance(type: TypeSeance, date = aujourdhui(), base: BaseCoach = db): Promise<Seance> {
  const profil = await chargerProfil(base)
  if (!profil) throw new Error('Profil manquant')
  const semaine = Math.max(1, semaineDe(profil.dateDebut, date))
  const etats = Object.fromEntries((await base.etats.toArray()).map((e) => [e.exerciceId, e]))
  const course = await etatCourse(base)
  const forme = scoreForme(await base.journal.get(date), await base.journal.get(ajouterJours(date, -1)))
  const numeroSeance = await base.seances.filter((s) => s.terminee).count()
  const coach = coachDuJour(await chargerCoach(), date) ?? undefined
  const plan = genererSeance({
    coach,
    type,
    semaine,
    profil,
    lib: EXERCICES,
    etats,
    etatCourse: course,
    forme,
    numeroSeance,
    messageCourse: course.message,
  })
  return {
    date,
    type,
    semaine,
    phase: phaseDe(semaine),
    zeroJoint: false,
    raison: plan.raison,
    allegee: plan.allegee,
    plan,
    exercices: [...plan.echauffement, ...plan.principal, ...plan.retourCalme].map((p) => ({ exerciceId: p.exerciceId, prevu: p, series: [] })),
    dureeSec: 0,
    terminee: false,
  }
}

// Fin de séance : on enregistre, puis on applique la double progression et la progression de la course.
export async function terminerSeance(seance: Seance, base: BaseCoach = db): Promise<string[]> {
  const profil = await chargerProfil(base)
  if (!profil) throw new Error('Profil manquant')
  const messages: string[] = []
  await base.transaction('rw', base.seances, base.etats, base.course, async () => {
    await base.seances.put({ ...seance, terminee: true })
    const principaux = new Set(seance.plan.principal.map((p) => p.exerciceId))
    for (const er of seance.exercices) {
      if (!principaux.has(er.exerciceId) || er.series.length === 0) continue
      const ex = EXERCICES_PAR_ID[er.exerciceId]
      if (!ex || !ex.fourchette || er.prevu.series <= 1) continue
      const avant: EtatExercice =
        (await base.etats.get(ex.id)) ?? etatInitial(ex, profil.kettlebells, seriesParPhase(seance.type, seance.phase))
      // La séance a pu être allégée : on juge sur ce qui était prévu ce jour-là.
      const jugeSur: EtatExercice = { ...avant, series: er.prevu.series, repsCible: er.prevu.reps }
      const r = appliquerProgression(ex, jugeSur, er.series, profil.kettlebells, seance.date)
      const etat: EtatExercice = seance.allegee && r.decision !== 'douleur'
        ? { ...avant, derniereFois: seance.date, douleur: false, dernierChangement: undefined }
        : { ...r.etat, series: r.decision === 'monte' || r.decision === 'baisse' ? r.etat.series : avant.series }
      await base.etats.put(etat)
      if (r.message && !seance.allegee) messages.push(r.message)
    }
    if (seance.course && seance.plan.course) {
      const avant = await etatCourse(base)
      const r = progresserCourse(avant, seance.course, seance.phase)
      if (!seance.allegee || r.decision === 'baisse') {
        await base.course.put({ ...r.etat, message: r.message || undefined })
        if (r.message) messages.push(r.message)
      }
    }
  })
  return messages
}
