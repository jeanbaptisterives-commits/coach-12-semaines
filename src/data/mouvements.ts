// Rangement « coach » : chaque mouvement regroupe 3 variantes de difficulté croissante,
// toutes sûres pour des épaules fragiles (rien au-dessus de la tête).
import type { Mouvement } from '../types'

export const MOUVEMENTS: Mouvement[] = [
  // ---------- Charnière de hanche ----------
  {
    id: 'swing',
    nom: 'Swing',
    famille: 'charniere',
    description: 'Puissance des hanches et cardio : les fessiers envoient la kettlebell, jamais les bras.',
    variantes: { facile: 'kb_swing_arret', moyen: 'kb_swing', difficile: 'kb_swing_un_bras' },
  },
  {
    id: 'souleve_de_terre',
    nom: 'Soulevé de terre',
    famille: 'charniere',
    description: 'Ramasser une charge dos plat : fessiers, ischio-jambiers et lombaires travaillent ensemble.',
    variantes: { facile: 'kb_deadlift', moyen: 'kb_souleve_roumain', difficile: 'kb_souleve_roumain_unijambe' },
  },
  {
    id: 'pont_fessier',
    nom: 'Pont fessier',
    famille: 'charniere',
    description: 'Extension de hanche au sol : les fessiers en isolation, sans charge sur le dos ni les épaules.',
    variantes: { facile: 'pont_fessier', moyen: 'pont_fessier_unijambe', difficile: 'hip_thrust_kb' },
  },

  // ---------- Squat ----------
  {
    id: 'squat_poids_du_corps',
    nom: 'Squat au poids du corps',
    famille: 'squat',
    description: 'S’asseoir et se relever : quadriceps et fessiers, de la chaise jusqu’à une jambe.',
    variantes: { facile: 'squat_chaise', moyen: 'squat_poids_corps', difficile: 'squat_pistol_assiste' },
  },
  {
    id: 'squat_kettlebell',
    nom: 'Squat kettlebell',
    famille: 'squat',
    description: 'Le squat chargé devant le corps : jambes, gainage et posture du haut du dos.',
    variantes: { facile: 'kb_goblet_squat', moyen: 'kb_squat_pause', difficile: 'kb_squat_rack' },
  },

  // ---------- Fente ----------
  {
    id: 'fente_arriere',
    nom: 'Fente arrière',
    famille: 'fente',
    description: 'Une jambe à la fois en reculant : la fente la plus douce pour les genoux.',
    variantes: { facile: 'fente_arriere', moyen: 'kb_fente_arriere_gobelet', difficile: 'fente_bulgare' },
  },
  {
    id: 'fente_avant',
    nom: 'Fente avant',
    famille: 'fente',
    description: 'Une jambe à la fois vers l’avant : force des cuisses, équilibre et freinage.',
    variantes: { facile: 'fente_statique', moyen: 'fente_avant', difficile: 'kb_fente_marchee' },
  },

  // ---------- Tirage ----------
  {
    id: 'rowing_kettlebell',
    nom: 'Rowing kettlebell',
    famille: 'tirage',
    description: 'Tirer une charge vers la hanche, buste penché : le dos qui équilibre les pompes.',
    variantes: { facile: 'kb_rowing_un_bras', moyen: 'kb_rowing_deux_mains', difficile: 'kb_gorilla_row' },
  },
  {
    id: 'tirage_horizontal',
    nom: 'Tirage horizontal',
    famille: 'tirage',
    description: 'Tirer son propre poids vers un appui : le rowing au poids du corps, sous une table.',
    variantes: {
      facile: 'tirage_serviette_isometrique',
      moyen: 'tirage_inverse_table',
      difficile: 'tirage_inverse_table_jambes_tendues',
    },
  },

  // ---------- Poussée ----------
  {
    id: 'pompe',
    nom: 'Pompe',
    famille: 'poussee',
    description: 'Pousser son poids devant soi : pectoraux, triceps et gainage, du mur jusqu’au sol.',
    variantes: { facile: 'pompes_murales', moyen: 'pompes_inclinees', difficile: 'pompes' },
  },
  {
    id: 'pompe_avancee',
    nom: 'Pompe avancée',
    famille: 'poussee',
    description: 'Quand la pompe classique est acquise : plus lent, plus de poids, puis un bras dominant.',
    variantes: { facile: 'pompes_tempo', moyen: 'pompes_declinees', difficile: 'pompes_archer' },
  },
  {
    id: 'developpe_sol',
    nom: 'Développé au sol',
    famille: 'poussee',
    description: 'Pousser une kettlebell allongé : le sol bloque la descente et protège l’avant de l’épaule.',
    variantes: { facile: 'kb_developpe_sol_deux_mains', moyen: 'kb_developpe_sol', difficile: 'kb_developpe_sol_pont' },
  },

  // ---------- Porté ----------
  {
    id: 'porte',
    nom: 'Porté',
    famille: 'porte',
    description: 'Marcher en portant lourd : poigne, trapèzes et gainage qui résiste à la charge.',
    variantes: { facile: 'kb_farmer_walk', moyen: 'kb_suitcase_carry', difficile: 'kb_rack_carry' },
  },

  // ---------- Gainage ----------
  {
    id: 'planche',
    nom: 'Planche',
    famille: 'gainage',
    description: 'Tenir le corps droit face au sol : la base du gainage abdominal.',
    variantes: { facile: 'planche_genoux', moyen: 'planche', difficile: 'planche_rkc' },
  },
  {
    id: 'gainage_lateral',
    nom: 'Gainage latéral',
    famille: 'gainage',
    description: 'Tenir sur le côté : obliques et moyen fessier, pour un bassin stable.',
    variantes: { facile: 'gainage_lateral_genoux', moyen: 'gainage_lateral', difficile: 'gainage_lateral_jambe_levee' },
  },
  {
    id: 'anti_extension',
    nom: 'Gainage sur le dos',
    famille: 'gainage',
    description: 'Garder le bas du dos collé au sol pendant que bras et jambes s’éloignent.',
    variantes: { facile: 'dead_bug', moyen: 'releve_jambes', difficile: 'hollow_hold' },
  },
  {
    id: 'anti_rotation',
    nom: 'Gainage anti-rotation',
    famille: 'gainage',
    description: 'Empêcher le tronc de tourner quand un appui disparaît : le gainage des gestes du quotidien.',
    variantes: { facile: 'bird_dog', moyen: 'planche_touche_epaule', difficile: 'kb_pull_through' },
  },

  // ---------- Cardio ----------
  {
    id: 'course',
    nom: 'Course',
    famille: 'cardio',
    description: 'Du course-marche au fractionné : l’endurance qui revient par étapes.',
    variantes: { facile: 'course_marche', moyen: 'course_continue', difficile: 'fractionne_course' },
  },
  {
    id: 'marche',
    nom: 'Marche',
    famille: 'cardio',
    description: 'Le cardio sans impact avec la chienne : rapide, en côte, puis avec un sac lesté.',
    variantes: { facile: 'marche_rapide_chienne', moyen: 'cotes_marche', difficile: 'marche_lestee' },
  },
  {
    id: 'velo',
    nom: 'Vélo',
    famille: 'cardio',
    description: 'Le cardio porté, sans choc pour les genoux : endurance, allure soutenue, fractionné.',
    variantes: { facile: 'velo_endurance', moyen: 'velo_tempo', difficile: 'fractionne_velo' },
  },
  {
    id: 'natation',
    nom: 'Natation',
    famille: 'cardio',
    description: 'Le cardio en portance : brasse, crawl, puis longueurs rapides.',
    variantes: { facile: 'natation_brasse', moyen: 'natation_crawl', difficile: 'natation_fractionne' },
  },

  // ---------- Pliométrie ----------
  {
    id: 'saut',
    nom: 'Saut',
    famille: 'pliometrie',
    description: 'Apprendre à décoller et à amortir : la détente, après feu vert médical.',
    variantes: { facile: 'sauts_sur_place', moyen: 'squat_saute', difficile: 'fentes_sautees' },
  },

  // ---------- Mobilité ----------
  {
    id: 'stabilite_omoplates',
    nom: 'Stabilité des omoplates',
    famille: 'mob_epaules',
    description: 'Réveiller les muscles qui tiennent les omoplates : la meilleure protection des épaules.',
    variantes: { facile: 'retractions_scapulaires', moyen: 'pompes_scapulaires', difficile: 'ytw_sol' },
  },
  {
    id: 'mobilite_epaule',
    nom: 'Mobilité de l’épaule',
    famille: 'mob_epaules',
    description: 'Faire bouger l’épaule en douceur, puis renforcer sa coiffe en rotation externe.',
    variantes: { facile: 'pendule_epaule', moyen: 'cercles_bras', difficile: 'rotation_externe_couche' },
  },
  {
    id: 'rotation_hanche',
    nom: 'Rotation de hanche',
    famille: 'mob_hanches',
    description: 'Retrouver la rotation de la hanche, souvent raide après des mois assis.',
    variantes: { facile: 'cercles_hanches', moyen: 'hanche_90_90', difficile: 'pigeon_au_sol' },
  },
  {
    id: 'ouverture_hanche',
    nom: 'Ouverture de hanche',
    famille: 'mob_hanches',
    description: 'Assouplir l’avant de la hanche et les adducteurs pour descendre plus bas en squat.',
    variantes: { facile: 'fente_basse_flechisseurs', moyen: 'etirement_grenouille', difficile: 'squat_profond_tenu' },
  },
  {
    id: 'rotation_thoracique',
    nom: 'Rotation thoracique',
    famille: 'mob_thoracique',
    description: 'Faire tourner le haut du dos pour soulager les épaules et le bas du dos.',
    variantes: { facile: 'livre_ouvert', moyen: 'rotation_thoracique_quadrupedie', difficile: 'rotation_fente' },
  },
]

export const MOUVEMENTS_PAR_ID: Record<string, Mouvement> = Object.fromEntries(MOUVEMENTS.map((m) => [m.id, m]))
