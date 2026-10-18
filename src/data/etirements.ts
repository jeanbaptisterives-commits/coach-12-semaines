import type { ProgrammeEtirement } from '../types'

// 6 programmes d'étirement et de mobilité, tous sûrs pour des épaules fragiles.
// sec = durée tenue (par côté si l'exercice est unilatéral), reps = répétitions lentes.
export const ETIREMENTS: ProgrammeEtirement[] = [
  {
    id: 'reveil',
    nom: 'Réveil en douceur',
    quand: 'Le matin, au saut du lit',
    description: 'Huit minutes pour dérouiller le dos, les hanches et les épaules avant la journée.',
    exercices: [
      { id: 'marche_active', sec: 60 },
      { id: 'rotations_articulaires', sec: 90 },
      { id: 'chat_vache', reps: 8 },
      { id: 'cercles_hanches', sec: 40 },
      { id: 'cercles_bras', sec: 40 },
      { id: 'extension_thoracique_serviette', reps: 8 },
    ],
  },
  {
    id: 'dos',
    nom: 'Dos et lombaires',
    quand: 'Après une longue journée debout ou au volant',
    description: 'Relâcher le bas du dos et redonner de la mobilité au haut du dos.',
    exercices: [
      { id: 'posture_enfant', sec: 60 },
      { id: 'chat_vache', reps: 10 },
      { id: 'rotation_thoracique_quadrupedie', reps: 8 },
      { id: 'extension_thoracique_serviette', reps: 8 },
      { id: 'etirement_fessier_couche', sec: 45 },
      { id: 'etirement_assis_jambes_tendues', sec: 45 },
      { id: 'respiration_ventrale', sec: 150 },
    ],
  },
  {
    id: 'hanches',
    nom: 'Hanches et fessiers',
    quand: 'Deux à trois fois par semaine',
    description: 'Ouvrir les hanches pour mieux squatter, courir et protéger le dos.',
    exercices: [
      { id: 'cercles_hanches', sec: 40 },
      { id: 'fente_basse_flechisseurs', sec: 45 },
      { id: 'hanche_90_90', sec: 60 },
      { id: 'pigeon_au_sol', sec: 45 },
      { id: 'etirement_grenouille', sec: 45 },
      { id: 'squat_profond_tenu', sec: 45 },
      { id: 'etirement_fessier_couche', sec: 45 },
    ],
  },
  {
    id: 'epaules',
    nom: 'Épaules en douceur',
    quand: 'Les jours sans séance de force',
    description: 'Des épaules qui bougent sans douleur : rien au-dessus de la tête, tout en contrôle.',
    exercices: [
      { id: 'pendule_epaule', sec: 40 },
      { id: 'retractions_scapulaires', reps: 12 },
      { id: 'cercles_bras', sec: 40 },
      { id: 'etirement_pectoraux_porte', sec: 40 },
      { id: 'rotation_externe_couche', reps: 12 },
      { id: 'livre_ouvert', reps: 8 },
      { id: 'ytw_sol', reps: 8 },
    ],
  },
  {
    id: 'apres_course',
    nom: 'Après la course',
    quand: 'Juste après la séance cardio ou la balade avec la chienne',
    description: 'Faire redescendre le cœur et relâcher mollets, cuisses et hanches.',
    exercices: [
      { id: 'marche_retour_calme', sec: 180 },
      { id: 'etirement_mollets', sec: 45 },
      { id: 'etirement_quadriceps', sec: 40 },
      { id: 'etirement_ischios', sec: 45 },
      { id: 'fente_basse_flechisseurs', sec: 45 },
      { id: 'etirement_fessier_couche', sec: 45 },
    ],
  },
  {
    id: 'soir',
    nom: 'Soir, détente et sommeil',
    quand: 'Le soir, pour décrocher de la journée',
    description: 'Douze minutes au sol pour relâcher le corps et préparer le sommeil.',
    exercices: [
      { id: 'respiration_ventrale', sec: 120 },
      { id: 'posture_enfant', sec: 60 },
      { id: 'etirement_assis_jambes_tendues', sec: 45 },
      { id: 'pigeon_au_sol', sec: 45 },
      { id: 'livre_ouvert', reps: 8 },
      { id: 'etirement_fessier_couche', sec: 45 },
      { id: 'respiration_ventrale', sec: 180 },
    ],
  },
]

export const ETIREMENT_PAR_ID = Object.fromEntries(ETIREMENTS.map((e) => [e.id, e]))
