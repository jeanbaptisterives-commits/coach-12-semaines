// Types partagés : bibliothèque d'exercices, base locale et moteur d'adaptation.

export type Categorie =
  | 'kettlebell'
  | 'poids_du_corps'
  | 'cardio'
  | 'gainage'
  | 'mobilite'
  | 'echauffement'
  | 'retour_calme'

// Famille de mouvement : sert à la rotation et aux remplacements (même famille = même rôle dans la séance).
export type Famille =
  | 'charniere' // swing, soulevé de terre, pont fessier
  | 'squat'
  | 'fente'
  | 'tirage' // rowings, tirage inversé, tractions
  | 'poussee' // pompes et variantes, floor press
  | 'porte' // farmer walk, suitcase carry
  | 'gainage'
  | 'cardio'
  | 'pliometrie' // sauts : haute intensité
  | 'mob_epaules'
  | 'mob_hanches'
  | 'mob_thoracique'
  | 'echauffement'
  | 'retour_calme'

export type Materiel = 'kettlebell' | 'poids_du_corps' | 'tapis' | 'table' | 'barre' | 'piscine' | 'velo' | 'chienne'

export type Mesure = 'reps' | 'duree' // duree en secondes

export interface Exercice {
  id: string
  nom: string
  categorie: Categorie
  famille: Famille
  materiel: Materiel[]
  objectif: string
  muscles: string[]
  miseEnPlace: string
  execution: string[] // étapes
  respiration: string
  erreurs: string[]
  plusFacile: string
  plusDifficile: string
  surEpaules: boolean // sûr pour des épaules fragiles
  intensite: 'basse' | 'moderee' | 'haute' // 'haute' = verrouillé sans feu vert médical
  niveau: 1 | 2 | 3 // difficulté dans sa famille
  mesure: Mesure
  unilateral?: boolean // reps par côté
  chargeable?: boolean // se fait avec une kettlebell dont on choisit le poids
  reference?: boolean // exercice de référence : jamais remplacé par la rotation
  fourchette?: [number, number] // reps (ou secondes si mesure = duree) par série, phase 1
  alternatives?: string[] // ids d'exercices plus sûrs / plus faciles de la même famille
  svg: string // schéma : contenu SVG complet (<svg viewBox=...>...</svg>), traits en currentColor
}

// ---------- Base locale ----------

export type ModeConso = 'joint_tabac' | 'joint_pur' | 'vaporisateur'
export type TypeSeance = 'A' | 'B' | 'C' | 'express'
export type Jour = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = dimanche (Date.getDay)

export interface Profil {
  id: 'moi'
  poidsDepart: number
  poidsCible?: number
  tailleCm: number
  kettlebells: number[] // kg possédés, triés
  jours: Jour[] // jours de séance
  feuVertMedical: boolean
  barreTraction: boolean
  dateDebut: string // AAAA-MM-JJ, lundi de la semaine 1
  creeLe: string
}

export interface SerieRealisee {
  reps: number // ou secondes si mesure = duree
  charge?: number // kg
  rpe: number // 1-10
  douleur: boolean
}

export interface ExerciceRealise {
  exerciceId: string
  prevu: PrescriptionExercice
  series: SerieRealisee[]
}

export interface Seance {
  id?: number
  date: string // AAAA-MM-JJ
  type: TypeSeance
  semaine: number
  phase: 1 | 2 | 3
  zeroJoint: boolean
  raison: string // pourquoi la séance a été ajustée, en une phrase
  allegee: boolean
  plan: SeancePlanifiee
  exercices: ExerciceRealise[]
  course?: CourseRealisee
  dureeSec: number
  terminee: boolean
}

export interface EtatExercice {
  exerciceId: string
  basReps: number
  hautReps: number
  repsCible: number // reps visées par série (double progression)
  charge?: number
  series: number
  echecs: number // séances ratées d'affilée
  douleur: boolean // douleur signalée à la dernière séance
  derniereFois?: string
  dernierChangement?: string // ex. « Swing : passage à 16 kg », affiché dans la raison de la séance suivante
}

export interface JournalJour {
  date: string // AAAA-MM-JJ
  energie?: number // /10
  sommeil?: number // /10
  heuresSommeil?: number
  joints?: number
  mode?: ModeConso
  heureDernier?: string // HH:MM
  jointMatin?: boolean // au moins un joint avant midi
}

export interface Pesee {
  date: string
  kg: number
}

export interface Test {
  id?: number
  semaine: 0 | 4 | 8 | 12
  date: string
  pompesMax?: number
  tempsCourseSec?: number
  distanceKm: 2 | 5
  energieMoyenne?: number
  poids?: number
}

export interface EtatCourse {
  id: 'course'
  courseSec: number // durée d'un bloc de course
  marcheSec: number // durée d'un bloc de marche
  blocs: number
  continueMin: number // 0 tant qu'on fait du course-marche
  message?: string // dernier changement, affiché dans la raison de la séance B suivante
}

// ---------- Moteur ----------

export interface PrescriptionExercice {
  exerciceId: string
  series: number
  reps: number // ou secondes
  charge?: number
  reposSec: number
  note?: string
}

export interface CourseRealisee {
  rpe: number
  douleur: boolean
  terminee: boolean
}

export interface SeancePlanifiee {
  type: TypeSeance
  echauffement: PrescriptionExercice[]
  principal: PrescriptionExercice[]
  retourCalme: PrescriptionExercice[]
  course?: EtatCourse
  raison: string
  allegee: boolean
  dureeEstimeeMin: number
}

// ---------- Mot du coach (écrit par Claude chaque matin sur le Mac) ----------

export interface MotCoach {
  date: string // AAAA-MM-JJ : jour pour lequel le mot et les consignes de séance valent
  message: string // 2-3 phrases, ton direct
  raison?: string // pourquoi la séance est ajustée, affiché dans la raison du jour
  seance?: {
    alleger?: boolean // -20 % de volume
    durcir?: boolean // une série de plus sur les exercices principaux (max 4)
    remplacer?: Array<{ de: string; par: string }>
  }
  // Réglages durables, appliqués une seule fois à la base (les cibles repartent de là).
  reglages?: {
    charges?: Record<string, number> // exerciceId -> kg
    repsCible?: Record<string, number> // exerciceId -> reps (ou secondes)
    course?: { courseSec: number; marcheSec: number; blocs: number; continueMin: number }
  }
}
