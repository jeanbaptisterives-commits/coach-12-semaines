import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { db } from './db/db'
import { Accueil } from './screens/Accueil'
import { Bibliotheque, PageExercice, PageFamille, PageMouvement } from './screens/Bibliotheque'
import { Onboarding } from './screens/Onboarding'
import { Reglages } from './screens/Reglages'
import { Seance } from './screens/Seance'
import { Poids, Tests } from './screens/Tests'

// Les graphiques (Recharts) ne se chargent qu'à l'ouverture de l'onglet Progrès.
const Progres = lazy(() => import('./screens/Progres').then((m) => ({ default: m.Progres })))

const ONGLETS = [
  { to: '/', label: 'Aujourd’hui', icone: 'M3 12l9-8 9 8M5 10v10h14V10' },
  { to: '/exercices', label: 'Exercices', icone: 'M4 6h16M4 12h16M4 18h10' },
  { to: '/progres', label: 'Progrès', icone: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { to: '/reglages', label: 'Réglages', icone: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12h2M3 12h2M12 3v2M12 19v2' },
]

function Coquille() {
  const profil = useLiveQuery(() => db.profil.get('moi'), [], null)
  const { pathname } = useLocation()
  if (profil === null) return null // chargement
  if (!profil) return <Onboarding />
  const enSeance = pathname.startsWith('/seance')
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className={`flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] ${enSeance ? 'pb-8' : 'pb-28'}`}>
        <Routes>
          <Route path="/" element={<Accueil profil={profil} />} />
          <Route path="/seance/:type" element={<Seance profil={profil} />} />
          <Route path="/exercices" element={<Bibliotheque />} />
          <Route path="/exercices/f/:famille" element={<PageFamille />} />
          <Route path="/exercices/m/:mouvement" element={<PageMouvement />} />
          <Route path="/exercices/e/:id" element={<PageExercice />} />
          <Route path="/progres" element={<Suspense fallback={null}><Progres profil={profil} /></Suspense>} />
          <Route path="/tests" element={<Tests />} />
          <Route path="/poids" element={<Poids />} />
          <Route path="/reglages" element={<Reglages profil={profil} />} />
        </Routes>
      </main>
      {!enSeance && (
        <nav className="fixed inset-x-0 bottom-0 border-t border-ligne bg-fond/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-4">
            {ONGLETS.map((o) => (
              <NavLink
                key={o.to}
                to={o.to}
                end={o.to === '/'}
                onClick={() => window.scrollTo(0, 0)}
                className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${isActive ? 'text-sauge-clair' : 'text-ivoire3'}`}
              >
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={o.icone} />
                </svg>
                {o.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Coquille />
    </HashRouter>
  )
}
