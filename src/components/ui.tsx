import { useEffect, useRef, useState, type ReactNode } from 'react'

// Gros boutons : utilisables en pleine séance, mains moites, téléphone posé par terre.

export function Bouton({
  children,
  onClick,
  variante = 'principal',
  className = '',
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variante?: 'principal' | 'secondaire' | 'danger' | 'fantome'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const styles = {
    principal: 'bg-lime-400 text-zinc-950 active:bg-lime-300',
    secondaire: 'bg-zinc-800 text-zinc-100 active:bg-zinc-700',
    danger: 'bg-red-500/90 text-white active:bg-red-400',
    fantome: 'bg-transparent text-zinc-300 underline underline-offset-4',
  }[variante]
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-14 rounded-2xl px-5 text-lg font-semibold transition disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function Carte({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-zinc-900 p-5 ${className}`}>{children}</section>
}

export function Titre({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">{children}</h2>
}

export function Pastille({ children, ton = 'neutre' }: { children: ReactNode; ton?: 'neutre' | 'ok' | 'alerte' }) {
  const c = { neutre: 'bg-zinc-800 text-zinc-300', ok: 'bg-lime-400/15 text-lime-300', alerte: 'bg-amber-400/15 text-amber-300' }[ton]
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${c}`}>{children}</span>
}

export function Compteur({
  valeur,
  onChange,
  pas = 1,
  min = 0,
  max = 999,
  suffixe = '',
  label,
}: {
  valeur: number
  onChange: (v: number) => void
  pas?: number
  min?: number
  max?: number
  suffixe?: string
  label?: string
}) {
  const fixer = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)))
  return (
    <div className="flex items-center justify-between gap-3">
      {label && <span className="text-zinc-300">{label}</span>}
      <div className="flex items-center gap-3">
        <button type="button" aria-label="moins" onClick={() => fixer(valeur - pas)} className="size-14 rounded-2xl bg-zinc-800 text-3xl active:bg-zinc-700">
          −
        </button>
        <span className="min-w-20 text-center text-3xl font-bold tabular-nums">
          {valeur}
          {suffixe && <span className="text-lg text-zinc-400">{suffixe}</span>}
        </span>
        <button type="button" aria-label="plus" onClick={() => fixer(valeur + pas)} className="size-14 rounded-2xl bg-zinc-800 text-3xl active:bg-zinc-700">
          +
        </button>
      </div>
    </div>
  )
}

// Échelle 1-10 en grille de gros boutons.
export function Echelle({
  valeur,
  onChange,
  label,
  min = 1,
  max = 10,
  aide,
}: {
  valeur?: number
  onChange: (v: number) => void
  label: string
  min?: number
  max?: number
  aide?: (v: number) => string
}) {
  const valeurs = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-zinc-300">{label}</span>
        {valeur != null && aide && <span className="text-sm text-zinc-400">{aide(valeur)}</span>}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {valeurs.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`h-12 rounded-xl text-lg font-semibold tabular-nums ${valeur === v ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800 text-zinc-200 active:bg-zinc-700'}`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Choix<T extends string | number>({
  options,
  valeur,
  onChange,
}: {
  options: Array<{ valeur: T; label: string }>
  valeur?: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.valeur)}
          type="button"
          onClick={() => onChange(o.valeur)}
          className={`min-h-12 rounded-xl px-4 font-medium ${valeur === o.valeur ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800 text-zinc-200 active:bg-zinc-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function fmtDuree(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function vibrer(motif: number | number[] = 200) {
  try {
    navigator.vibrate?.(motif)
  } catch {
    /* iPhone : pas de vibration web, le bip suffit */
  }
}

let ctxAudio: AudioContext | null = null
export function bip(frequence = 880, dureeMs = 180) {
  try {
    ctxAudio ??= new AudioContext()
    const o = ctxAudio.createOscillator()
    const g = ctxAudio.createGain()
    o.frequency.value = frequence
    g.gain.value = 0.15
    o.connect(g).connect(ctxAudio.destination)
    o.start()
    o.stop(ctxAudio.currentTime + dureeMs / 1000)
  } catch {
    /* audio indisponible */
  }
}

// Compte à rebours basé sur l'heure réelle : reste juste même si l'écran se met en veille.
export function useCompteARebours(onFin?: () => void) {
  const [fin, setFin] = useState<number | null>(null)
  const [reste, setReste] = useState(0)
  const finRef = useRef(onFin)
  finRef.current = onFin
  useEffect(() => {
    if (fin == null) return
    const t = setInterval(() => {
      const r = Math.ceil((fin - Date.now()) / 1000)
      setReste(Math.max(0, r))
      if (r <= 3 && r > 0) bip(660, 80)
      if (r <= 0) {
        setFin(null)
        bip(990, 400)
        vibrer([200, 100, 200])
        finRef.current?.()
      }
    }, 250)
    return () => clearInterval(t)
  }, [fin])
  return {
    reste,
    actif: fin != null,
    demarrer: (sec: number) => {
      setReste(sec)
      setFin(Date.now() + sec * 1000)
    },
    arreter: () => setFin(null),
  }
}

export function Svg({ code, className = '' }: { code: string; className?: string }) {
  return <div className={`[&>svg]:h-full [&>svg]:w-full ${className}`} dangerouslySetInnerHTML={{ __html: code }} />
}
