// Mini-bibliothèque pour les tests du moteur : indépendante de la vraie bibliothèque.
import type { Exercice, Famille, Profil } from '../types'

let n = 0
export function ex(id: string, famille: Famille, extra: Partial<Exercice> = {}): Exercice {
  n++
  return {
    id,
    nom: id,
    categorie: 'poids_du_corps',
    famille,
    materiel: ['poids_du_corps'],
    objectif: 'o',
    muscles: [],
    miseEnPlace: 'm',
    execution: ['a', 'b', 'c'],
    respiration: 'r',
    erreurs: ['e', 'f'],
    plusFacile: 'f',
    plusDifficile: 'd',
    surEpaules: true,
    intensite: 'moderee',
    niveau: 1,
    mesure: 'reps',
    fourchette: [8, 12],
    svg: `<svg viewBox="0 0 1 1" data-n="${n}"></svg>`,
    ...extra,
  }
}

const kb = { categorie: 'kettlebell' as const, materiel: ['kettlebell' as const], chargeable: true }

export const LIB: Exercice[] = [
  ex('kb_swing', 'charniere', { ...kb, reference: true, fourchette: [10, 15], alternatives: ['kb_deadlift'] }),
  ex('kb_deadlift', 'charniere', { ...kb }),
  ex('pont_fessier', 'charniere'),
  ex('good_morning', 'charniere', { niveau: 2 }),
  ex('kb_goblet_squat', 'squat', { ...kb, reference: true, alternatives: ['squat_boite'] }),
  ex('squat_boite', 'squat'),
  ex('kb_rowing_un_bras', 'tirage', { ...kb, reference: true, unilateral: true, alternatives: ['tirage_inverse_table'] }),
  ex('tirage_inverse_table', 'tirage', { materiel: ['table'] }),
  ex('tractions', 'tirage', { materiel: ['barre'], niveau: 3 }),
  ex('tractions_negatives', 'tirage', { materiel: ['barre'], niveau: 2 }),
  ex('pompes', 'poussee', { reference: true, fourchette: [6, 12], alternatives: ['pompes_inclinees', 'pompes_genoux'] }),
  ex('pompes_inclinees', 'poussee'),
  ex('pompes_genoux', 'poussee'),
  ex('dips', 'poussee', { surEpaules: false, niveau: 2 }),
  ex('pike_pushup', 'poussee', { surEpaules: false, niveau: 2 }),
  ex('kb_press', 'poussee', { ...kb, surEpaules: false }),
  ex('fente_arriere', 'fente'),
  ex('fente_marchee', 'fente', { niveau: 2 }),
  ex('kb_farmer_walk', 'porte', { ...kb, mesure: 'duree', fourchette: [30, 45] }),
  ex('planche', 'gainage', { reference: true, mesure: 'duree', fourchette: [20, 40], alternatives: ['planche_genoux'] }),
  ex('planche_genoux', 'gainage', { mesure: 'duree', fourchette: [20, 30] }),
  ex('dead_bug', 'gainage'),
  ex('fractionne_course', 'cardio', { intensite: 'haute', mesure: 'duree', categorie: 'cardio' }),
  ex('jump_squat', 'pliometrie', { intensite: 'haute' }),
  ex('mob_ep_1', 'mob_epaules', { mesure: 'duree', fourchette: [30, 45] }),
  ex('mob_ep_2', 'mob_epaules', { mesure: 'duree', fourchette: [30, 45] }),
  ex('mob_ha_1', 'mob_hanches', { mesure: 'duree', fourchette: [30, 45] }),
  ex('mob_th_1', 'mob_thoracique', { mesure: 'duree', fourchette: [30, 45] }),
  ex('ech_1', 'echauffement'),
  ex('ech_2', 'echauffement'),
  ex('ech_3', 'echauffement'),
  ex('ech_4', 'echauffement'),
  ex('rc_1', 'retour_calme', { mesure: 'duree', fourchette: [45, 60] }),
  ex('rc_2', 'retour_calme', { mesure: 'duree', fourchette: [45, 60] }),
  ex('rc_3', 'retour_calme', { mesure: 'duree', fourchette: [45, 60] }),
]

export const PROFIL: Profil = {
  id: 'moi',
  poidsDepart: 82,
  tailleCm: 180,
  kettlebells: [8, 12, 16, 20],
  jours: [2, 4, 6],
  feuVertMedical: false,
  barreTraction: false,
  dateDebut: '2026-10-19',
  creeLe: '2026-10-18',
}

export function parId(id: string): Exercice {
  const e = LIB.find((x) => x.id === id)
  if (!e) throw new Error(id)
  return e
}
