// Bibliothèque complète des exercices, assemblée à partir des fichiers par famille.
import type { Exercice } from '../types'
import { EXERCICES_CHARNIERE, EXERCICES_FENTE, EXERCICES_PLIOMETRIE, EXERCICES_SQUAT } from './exercices-bas'
import { EXERCICES_CARDIO, EXERCICES_GAINAGE } from './exercices-gainage-cardio'
import { EXERCICES_POUSSEE, EXERCICES_PORTE, EXERCICES_TIRAGE } from './exercices-haut'
import {
  EXERCICES_ECHAUFFEMENT, EXERCICES_MOB_EPAULES, EXERCICES_MOB_HANCHES, EXERCICES_MOB_THORACIQUE,
  EXERCICES_RETOUR_CALME,
} from './exercices-mobilite'

export const EXERCICES: Exercice[] = [
  ...EXERCICES_CHARNIERE,
  ...EXERCICES_SQUAT,
  ...EXERCICES_FENTE,
  ...EXERCICES_TIRAGE,
  ...EXERCICES_POUSSEE,
  ...EXERCICES_PORTE,
  ...EXERCICES_GAINAGE,
  ...EXERCICES_CARDIO,
  ...EXERCICES_PLIOMETRIE,
  ...EXERCICES_MOB_EPAULES,
  ...EXERCICES_MOB_HANCHES,
  ...EXERCICES_MOB_THORACIQUE,
  ...EXERCICES_ECHAUFFEMENT,
  ...EXERCICES_RETOUR_CALME,
]

export const EXERCICES_PAR_ID: Record<string, Exercice> = Object.fromEntries(EXERCICES.map((e) => [e.id, e]))
