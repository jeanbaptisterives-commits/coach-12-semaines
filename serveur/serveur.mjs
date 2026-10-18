// Serveur local de l'app, sur le Mac : sert l'app et garde les données dans un fichier.
// - GET  /api/donnees : la sauvegarde complète (même format que l'export JSON de l'app)
// - PUT  /api/donnees : remplace la sauvegarde (écriture atomique, copie sur le TOSHIBA, instantané du jour)
// - GET  /api/coach   : le mot du coach et les ajustements écrits par Claude chaque matin
// Écoute uniquement sur 127.0.0.1 : rien n'est accessible depuis le réseau.
import { createServer } from 'node:http'
import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { homedir } from 'node:os'

const PORT = Number(process.env.COACH_PORT ?? 8787)
const RACINE = new URL('..', import.meta.url).pathname
const DIST = join(RACINE, 'dist')
export const DOSSIER = process.env.COACH_DONNEES ?? join(homedir(), 'Work', 'coach-12-semaines-donnees')
const TOSHIBA = process.env.COACH_COPIE ?? '/Volumes/TOSHIBA EXT/Coach-12-semaines'
const FICHIER = join(DOSSIER, 'donnees.json')
// Noms d'hôte acceptés en plus de localhost : l'adresse Tailscale du Mac (réseau privé de JB, téléphone compris).
const HOTES_TAILSCALE = (process.env.COACH_HOTES ?? 'almadhome.tail86b509.ts.net,almadhome,100.127.185.28').split(',').filter(Boolean)
const COACH = join(DOSSIER, 'coach.json')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

const journal = (...m) => console.log(new Date().toISOString(), ...m)

async function lireCorps(req, max = 20 * 1024 * 1024) {
  const morceaux = []
  let taille = 0
  for await (const m of req) {
    taille += m.length
    if (taille > max) throw new Error('trop gros')
    morceaux.push(m)
  }
  return Buffer.concat(morceaux).toString('utf8')
}

async function ecrireAtomique(chemin, contenu) {
  const tmp = `${chemin}.tmp-${process.pid}`
  await writeFile(tmp, contenu)
  await rename(tmp, chemin)
}

async function enregistrer(texte) {
  const json = JSON.parse(texte)
  if (json?.app !== 'coach-12-semaines' || !json.donnees) throw new Error('format inconnu')
  await mkdir(join(DOSSIER, 'historique'), { recursive: true })
  await ecrireAtomique(FICHIER, JSON.stringify(json, null, 1))
  // Un instantané par jour : on peut toujours revenir en arrière.
  const jour = new Date().toISOString().slice(0, 10)
  await copyFile(FICHIER, join(DOSSIER, 'historique', `donnees-${jour}.json`))
  // Copie sur le disque externe s'il est branché ; sinon la sauvegarde de 21 h rattrapera.
  if (existsSync('/Volumes/TOSHIBA EXT') || process.env.COACH_COPIE) {
    try {
      await mkdir(TOSHIBA, { recursive: true })
      await copyFile(FICHIER, join(TOSHIBA, 'donnees.json'))
    } catch (e) {
      journal('copie TOSHIBA impossible :', e.message)
    }
  }
}

async function servirFichier(res, url) {
  let chemin = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  if (chemin === '/' || chemin === '') chemin = '/index.html'
  let complet = join(DIST, chemin)
  if (!complet.startsWith(DIST) || !existsSync(complet) || (await stat(complet)).isDirectory()) complet = join(DIST, 'index.html')
  const contenu = await readFile(complet)
  const sansCache = complet.endsWith('index.html') || complet.endsWith('sw.js')
  res.writeHead(200, { 'Content-Type': TYPES[extname(complet)] ?? 'application/octet-stream', 'Cache-Control': sansCache ? 'no-cache' : 'max-age=31536000' })
  res.end(contenu)
}

export function creerServeur() {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const json = (code, corps) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(typeof corps === 'string' ? corps : JSON.stringify(corps))
    }
    // Anti « DNS rebinding » : un site malveillant ouvert dans le navigateur ne doit jamais pouvoir
    // lire ou écrire les données. On n'accepte que l'adresse locale, et l'écriture que depuis l'app.
    const port = req.socket.localPort
    const locaux = [`localhost:${port}`, `127.0.0.1:${port}`, ...HOTES_TAILSCALE]
    if (!locaux.includes(req.headers.host ?? '')) {
      res.writeHead(403)
      return res.end()
    }
    if (req.method === 'PUT') {
      const origine = req.headers.origin
      const typeJson = (req.headers['content-type'] ?? '').startsWith('application/json')
      if ((origine && !locaux.map((h) => `http://${h}`).includes(origine)) || !typeJson) return json(403, { erreur: 'refusé' })
    }
    try {
      if (url.pathname === '/api/donnees' && req.method === 'GET') {
        return existsSync(FICHIER) ? json(200, await readFile(FICHIER, 'utf8')) : json(404, { erreur: 'aucune donnée' })
      }
      if (url.pathname === '/api/donnees' && req.method === 'PUT') {
        await enregistrer(await lireCorps(req))
        return json(200, { ok: true, le: new Date().toISOString() })
      }
      if (url.pathname === '/api/coach' && req.method === 'GET') {
        return existsSync(COACH) ? json(200, await readFile(COACH, 'utf8')) : json(404, { erreur: 'pas de mot du coach' })
      }
      if (url.pathname.startsWith('/api/')) return json(404, { erreur: 'inconnu' })
      if (req.method !== 'GET') return json(405, { erreur: 'méthode' })
      return await servirFichier(res, url)
    } catch (e) {
      journal('erreur', req.method, url.pathname, e.message)
      return json(400, { erreur: e.message })
    }
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await mkdir(DOSSIER, { recursive: true })
  creerServeur().listen(PORT, '127.0.0.1', () => journal(`Coach 12 semaines : http://localhost:${PORT} · données ${DOSSIER}`))
}
