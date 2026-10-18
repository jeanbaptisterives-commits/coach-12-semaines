// Dates locales au format AAAA-MM-JJ (jamais d'UTC : une séance à 7 h doit tomber sur le bon jour).

export function isoLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}

export function depuisIso(iso: string): Date {
  const [a, m, j] = iso.split('-').map(Number)
  return new Date(a, m - 1, j)
}

export function ajouterJours(iso: string, n: number): string {
  const d = depuisIso(iso)
  d.setDate(d.getDate() + n)
  return isoLocal(d)
}

export function ecartJours(de: string, a: string): number {
  return Math.round((depuisIso(a).getTime() - depuisIso(de).getTime()) / 86_400_000)
}

export function jourSemaine(iso: string): number {
  return depuisIso(iso).getDay()
}

// Lundi de la semaine qui contient la date.
export function lundiDe(iso: string): string {
  const j = jourSemaine(iso)
  return ajouterJours(iso, j === 0 ? -6 : 1 - j)
}

// Semaine du programme : 1 la première semaine, 0 avant le début, peut dépasser 12.
export function semaineDe(dateDebut: string, iso: string): number {
  const ecart = ecartJours(lundiDe(dateDebut), iso)
  return ecart < 0 ? 0 : Math.floor(ecart / 7) + 1
}

export function phaseDe(semaine: number): 1 | 2 | 3 {
  if (semaine <= 4) return 1
  if (semaine <= 8) return 2
  return 3
}

export const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
