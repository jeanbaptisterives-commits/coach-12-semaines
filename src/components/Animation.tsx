import { ANIMATIONS } from '../data/animations'
import type { Exercice } from '../types'
import { Svg } from './ui'

// Animation Remotion de l'exercice (boucle muette), ou son schéma s'il n'a pas encore d'animation.
export function Animation({ ex, className = '' }: { ex: Exercice; className?: string }) {
  if (ANIMATIONS.has(ex.id)) {
    return (
      <video
        key={ex.id}
        src={`./animations/${ex.id}.mp4`}
        className={`aspect-square w-full rounded-3xl bg-[#1b1e18] object-cover ${className}`}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-label={`Animation : ${ex.nom}`}
      />
    )
  }
  return (
    <div className={`aspect-square w-full rounded-3xl bg-carte2 p-10 text-sauge-clair ${className}`}>
      <Svg code={ex.svg} className="h-full w-full" />
    </div>
  )
}
