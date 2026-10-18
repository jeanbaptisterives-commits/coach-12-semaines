import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { appliquerReglagesCoach, chargerCoach, demarrerSync } from './db/sync'
import { demarrerCloud } from './db/cloud'

// On récupère d'abord les données (sinon l'app croirait à un premier lancement), puis les réglages du coach.
async function lancer() {
  // Dans l'artefact Claude : la base de l'artefact. Sur le Mac : le serveur local. Sinon : le navigateur seul.
  if ((await demarrerCloud()) || (await demarrerSync())) {
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
