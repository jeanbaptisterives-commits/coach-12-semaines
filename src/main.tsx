import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { appliquerReglagesCoach, chargerCoach, demarrerSync } from './db/sync'

// Sur le Mac : on récupère d'abord le fichier de données (sinon l'app croirait à un premier lancement),
// puis les réglages du coach. En ligne (GitHub Pages) ces deux appels ne font rien.
async function lancer() {
  if (await demarrerSync()) {
    const coach = await chargerCoach()
    if (coach) await appliquerReglagesCoach(coach)
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
lancer()
