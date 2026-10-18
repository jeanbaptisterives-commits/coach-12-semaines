import type { Famille } from '../types'

// Familles telles qu'un coach les range, avec une teinte par famille tirée de la charte AlmaDhome
// (tons terre et sauge, jamais criards). L'ordre est celui de l'écran Exercices.
export interface InfoFamille {
  id: Famille
  nom: string
  court: string // libellé en majuscules sur les pastilles
  teinte: string
  phrase: string
}

export const FAMILLES: InfoFamille[] = [
  { id: 'charniere', nom: 'Charnière de hanche', court: 'CHARNIÈRE', teinte: '#c4a35a', phrase: 'Swing, soulevé de terre, pont : la chaîne arrière' },
  { id: 'squat', nom: 'Squat', court: 'SQUAT', teinte: '#7a8b6f', phrase: 'Plier les jambes avec le buste droit' },
  { id: 'fente', nom: 'Fente', court: 'FENTE', teinte: '#9c8f6a', phrase: 'Une jambe à la fois : force et équilibre' },
  { id: 'tirage', nom: 'Tirage', court: 'TIRAGE', teinte: '#6f8a86', phrase: 'Le dos qui tire : posture et épaules solides' },
  { id: 'poussee', nom: 'Poussée', court: 'POUSSÉE', teinte: '#b07d5b', phrase: 'Pompes et développés, jamais au-dessus de la tête' },
  { id: 'porte', nom: 'Porté', court: 'PORTÉ', teinte: '#8b7a6f', phrase: 'Marcher chargé : poigne et gainage' },
  { id: 'gainage', nom: 'Gainage', court: 'GAINAGE', teinte: '#a9ba9c', phrase: 'Un tronc solide qui protège le dos' },
  { id: 'cardio', nom: 'Cardio', court: 'CARDIO', teinte: '#c98f5e', phrase: 'Course, marche, vélo, natation' },
  { id: 'pliometrie', nom: 'Pliométrie', court: 'SAUTS', teinte: '#a86a4f', phrase: 'Sauts : verrouillés sans feu vert médical' },
  { id: 'mob_epaules', nom: 'Mobilité des épaules', court: 'MOBILITÉ', teinte: '#8fa3a0', phrase: 'Des épaules qui bougent sans douleur' },
  { id: 'mob_hanches', nom: 'Mobilité des hanches', court: 'MOBILITÉ', teinte: '#93a58a', phrase: 'Des hanches libres pour squatter et courir' },
  { id: 'mob_thoracique', nom: 'Mobilité thoracique', court: 'MOBILITÉ', teinte: '#9aa894', phrase: 'Le haut du dos qui tourne et s’ouvre' },
  { id: 'echauffement', nom: 'Échauffement', court: 'ÉCHAUFFEMENT', teinte: '#b8b2a6', phrase: 'Préparer le corps en 3 minutes' },
  { id: 'retour_calme', nom: 'Retour au calme', court: 'RETOUR AU CALME', teinte: '#8a8f86', phrase: 'Étirer et respirer pour finir' },
]

export const FAMILLE_PAR_ID = Object.fromEntries(FAMILLES.map((f) => [f.id, f])) as Record<Famille, InfoFamille>

export const NOMS_VARIANTES = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' } as const
