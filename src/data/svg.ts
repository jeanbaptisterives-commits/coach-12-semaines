// Petits outils pour dessiner les schémas d'exercices en bonhomme bâton.
// Repère 120 × 120, sol à y = 110. Tout est en currentColor.

export type P = [number, number]

// t tête, c cou/épaules, b bassin, cg/mg coude et main gauche, cd/md coude et main droite,
// gg/pg genou et pied gauche, gd/pd genou et pied droit.
export interface Pose {
  t: P
  c: P
  b: P
  cg: P
  mg: P
  cd: P
  md: P
  gg: P
  pg: P
  gd: P
  pd: P
}

const pt = (p: P): string => `${p[0]} ${p[1]}`
const trait = (...pts: P[]): string => `<path d="M${pts.map(pt).join(' L')}"/>`

export function svg(...parts: string[]): string {
  return (
    '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
    parts.join('') +
    '</svg>'
  )
}

export const sol = (): string => '<path d="M6 110 H114"/>'

export function corps(p: Pose): string {
  return (
    `<circle cx="${p.t[0]}" cy="${p.t[1]}" r="7"/>` +
    trait(p.c, p.b) +
    trait(p.c, p.cg, p.mg) +
    trait(p.c, p.cd, p.md) +
    trait(p.b, p.gg, p.pg) +
    trait(p.b, p.gd, p.pd)
  )
}

// Kettlebell suspendue : (x, y) = point de prise de la poignée.
export function kb(x: number, y: number): string {
  return `<path d="M${x - 5} ${y + 4} Q${x} ${y - 4} ${x + 5} ${y + 4}"/><circle cx="${x}" cy="${y + 10}" r="6.5"/>`
}

// Flèche pointillée de a vers b, courbe si un point de contrôle est donné.
export function fleche(a: P, b: P, ctrl?: P): string {
  const d = ctrl ? `M${pt(a)} Q${pt(ctrl)} ${pt(b)}` : `M${pt(a)} L${pt(b)}`
  const from = ctrl ?? a
  const ang = Math.atan2(b[1] - from[1], b[0] - from[0])
  const l = 6
  const h1: P = [
    Math.round((b[0] - l * Math.cos(ang - 0.5)) * 10) / 10,
    Math.round((b[1] - l * Math.sin(ang - 0.5)) * 10) / 10,
  ]
  const h2: P = [
    Math.round((b[0] - l * Math.cos(ang + 0.5)) * 10) / 10,
    Math.round((b[1] - l * Math.sin(ang + 0.5)) * 10) / 10,
  ]
  return `<path d="${d}" stroke-width="2" stroke-dasharray="4 4"/>` + `<path d="M${pt(h1)} L${pt(b)} L${pt(h2)}" stroke-width="2"/>`
}

// Table vue de profil : plateau de x1 à x2 à la hauteur y.
export function table(x1: number, x2: number, y: number): string {
  return `<path d="M${x1} ${y} H${x2} M${x1 + 4} ${y} V110 M${x2 - 4} ${y} V110"/>`
}

// Mur vertical.
export const mur = (x: number): string => `<path d="M${x} 14 V110"/>`

// Barre de traction horizontale.
export const barre = (x1: number, x2: number, y: number): string => `<path d="M${x1} ${y} H${x2}"/>`

// Ligne d'eau ondulée.
export function eau(y: number): string {
  let d = `M6 ${y}`
  for (let x = 6; x < 114; x += 12) d += ` q6 -4 12 0`
  return `<path d="${d}" stroke-width="2"/>`
}

// Chienne stylisée, (x, y) = bas des pattes avant.
export function chienne(x: number, y = 110): string {
  return (
    `<circle cx="${x + 4}" cy="${y - 24}" r="4"/>` +
    `<path d="M${x} ${y - 18} L${x - 22} ${y - 18} M${x} ${y - 18} L${x + 2} ${y} M${x - 4} ${y - 18} L${x - 6} ${y}` +
    ` M${x - 22} ${y - 18} L${x - 20} ${y} M${x - 18} ${y - 18} L${x - 16} ${y} M${x - 22} ${y - 18} L${x - 28} ${y - 26}"/>`
  )
}

// Laisse de la main vers la chienne.
export const laisse = (main: P, collier: P): string =>
  `<path d="M${pt(main)} Q${(main[0] + collier[0]) / 2} ${Math.max(main[1], collier[1]) + 8} ${pt(collier)}" stroke-width="1.5"/>`

// Vélo de profil.
export function velo(): string {
  return (
    '<circle cx="30" cy="92" r="16"/><circle cx="92" cy="92" r="16"/>' +
    '<path d="M30 92 L50 66 L82 66 L92 92 M50 66 L58 92 L30 92 M58 92 L82 66 M82 66 L80 56 L88 54 M46 60 L56 60"/>'
  )
}

export function modif(base: Pose, o: Partial<Pose>): Pose {
  return { ...base, ...o }
}

export function dessin(p: Pose, ...extras: string[]): string {
  return svg(sol(), corps(p), ...extras)
}

// ---------- Poses de base ----------

export const DEBOUT: Pose = {
  t: [60, 18], c: [60, 27], b: [60, 60],
  cg: [58, 44], mg: [58, 60], cd: [62, 44], md: [62, 60],
  gg: [58, 85], pg: [58, 110], gd: [62, 85], pd: [62, 110],
}

export const CHARNIERE: Pose = {
  t: [83, 40], c: [76, 47], b: [46, 62],
  cg: [76, 61], mg: [76, 75], cd: [78, 61], md: [78, 75],
  gg: [53, 86], pg: [52, 110], gd: [56, 86], pd: [56, 110],
}

export const BRAS_AVANT: Partial<Pose> = { cg: [74, 30], mg: [88, 32], cd: [74, 32], md: [88, 34] }

export const SQUAT: Pose = {
  t: [59, 41], c: [56, 50], b: [44, 82],
  cg: [62, 66], mg: [67, 55], cd: [64, 66], md: [69, 55],
  gg: [68, 80], pg: [62, 110], gd: [70, 82], pd: [65, 110],
}

export const FENTE: Pose = {
  t: [58, 27], c: [58, 36], b: [58, 68],
  cg: [56, 52], mg: [56, 66], cd: [60, 52], md: [60, 66],
  gg: [52, 102], pg: [30, 110], gd: [78, 76], pd: [78, 110],
}

export const PLANCHE: Pose = {
  t: [20, 82], c: [28, 86], b: [66, 90],
  cg: [28, 108], mg: [42, 108], cd: [30, 108], md: [44, 108],
  gg: [86, 95], pg: [106, 107], gd: [86, 96], pd: [106, 108],
}

export const POMPE_HAUT: Pose = {
  t: [20, 64], c: [28, 68], b: [66, 82],
  cg: [28, 88], mg: [28, 108], cd: [30, 88], md: [30, 108],
  gg: [86, 95], pg: [106, 107], gd: [86, 96], pd: [106, 108],
}

export const POMPE_BAS: Pose = {
  t: [18, 90], c: [26, 94], b: [64, 99],
  cg: [40, 98], mg: [28, 108], cd: [42, 99], md: [30, 108],
  gg: [86, 103], pg: [106, 107], gd: [86, 104], pd: [106, 108],
}

export const DOS: Pose = {
  t: [18, 101], c: [27, 104], b: [60, 105],
  cg: [38, 106], mg: [50, 106], cd: [39, 107], md: [51, 107],
  gg: [76, 86], pg: [90, 108], gd: [78, 87], pd: [92, 108],
}

export const PONT: Pose = modif(DOS, { b: [62, 86], gg: [80, 80], gd: [82, 81] })

export const QUADRUPEDIE: Pose = {
  t: [24, 58], c: [32, 64], b: [74, 64],
  cg: [32, 86], mg: [32, 108], cd: [34, 86], md: [34, 108],
  gg: [74, 108], pg: [98, 108], gd: [76, 108], pd: [100, 108],
}

export const DEAD_BUG: Pose = modif(DOS, {
  cg: [27, 86], mg: [27, 70], cd: [16, 96], md: [6, 92],
  gg: [62, 84], pg: [80, 84], gd: [84, 98], pd: [104, 96],
})

export const COURSE: Pose = {
  t: [64, 18], c: [62, 27], b: [58, 58],
  cg: [54, 42], mg: [48, 52], cd: [70, 40], md: [78, 32],
  gg: [54, 82], pg: [42, 108], gd: [74, 74], pd: [70, 96],
}

export const ASSIS: Pose = {
  t: [48, 63], c: [46, 72], b: [40, 104],
  cg: [60, 84], mg: [78, 94], cd: [62, 85], md: [80, 95],
  gg: [70, 106], pg: [98, 106], gd: [70, 107], pd: [98, 107],
}

export const GENOUX: Pose = {
  t: [60, 31], c: [60, 40], b: [60, 74],
  cg: [58, 56], mg: [58, 72], cd: [62, 56], md: [62, 72],
  gg: [60, 107], pg: [36, 108], gd: [62, 107], pd: [38, 108],
}

export const ENFANT: Pose = {
  t: [34, 99], c: [44, 96], b: [80, 92],
  cg: [30, 104], mg: [14, 106], cd: [31, 105], md: [15, 107],
  gg: [70, 108], pg: [94, 108], gd: [72, 108], pd: [96, 108],
}

export const VENTRE: Pose = {
  t: [18, 100], c: [27, 104], b: [62, 106],
  cg: [38, 106], mg: [50, 106], cd: [39, 107], md: [51, 107],
  gg: [84, 107], pg: [106, 108], gd: [84, 108], pd: [106, 109],
}

export const COTE: Pose = {
  t: [22, 74], c: [30, 80], b: [64, 92],
  cg: [30, 106], mg: [44, 106], cd: [46, 80], md: [60, 88],
  gg: [84, 100], pg: [104, 107], gd: [84, 101], pd: [104, 108],
}

export const NAGE: Pose = {
  t: [22, 62], c: [31, 64], b: [66, 66],
  cg: [16, 64], mg: [4, 64], cd: [40, 76], md: [52, 72],
  gg: [86, 66], pg: [106, 62], gd: [86, 68], pd: [106, 72],
}

export const CYCLISTE: Pose = {
  t: [72, 34], c: [66, 42], b: [52, 62],
  cg: [76, 52], mg: [84, 56], cd: [77, 53], md: [85, 57],
  gg: [68, 72], pg: [60, 92], gd: [64, 78], pd: [52, 96],
}

// Kettlebell tenue bras tendu au-dessus de la tête : (x, y) = main.
export function kbHaut(x: number, y: number): string {
  return `<path d="M${x - 4} ${y + 3} Q${x} ${y - 5} ${x + 4} ${y + 3}"/><circle cx="${x + 9}" cy="${y + 4}" r="6"/>`
}
