import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const donnees = mkdtempSync(join(tmpdir(), 'coach-donnees-'))
const copie = mkdtempSync(join(tmpdir(), 'coach-copie-'))
process.env.COACH_DONNEES = donnees
process.env.COACH_COPIE = copie

let url = ''
let fermer: () => void
beforeAll(async () => {
  const { creerServeur } = await import('./serveur.mjs')
  const s = creerServeur()
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r))
  url = `http://127.0.0.1:${(s.address() as AddressInfo).port}`
  fermer = () => s.close()
})
afterAll(() => fermer())

const sauvegarde = { app: 'coach-12-semaines', version: 1, exporteLe: 'x', donnees: { profil: [{ id: 'moi' }], seances: [], etats: [], course: [], journal: [], pesees: [], tests: [] } }

describe('serveur local', () => {
  it('rien au départ, puis enregistre, relit, garde un instantané et une copie TOSHIBA', async () => {
    expect((await fetch(`${url}/api/donnees`)).status).toBe(404)
    const put = await fetch(`${url}/api/donnees`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sauvegarde) })
    expect(put.status).toBe(200)
    const lu = await (await fetch(`${url}/api/donnees`)).json()
    expect(lu.donnees.profil[0].id).toBe('moi')
    expect(existsSync(join(donnees, 'historique', `donnees-${new Date().toISOString().slice(0, 10)}.json`))).toBe(true)
    expect(JSON.parse(readFileSync(join(copie, 'donnees.json'), 'utf8')).app).toBe('coach-12-semaines')
  })
  it('refuse un fichier qui n’est pas une sauvegarde, sans écraser la bonne', async () => {
    expect((await fetch(`${url}/api/donnees`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"app":"autre"}' })).status).toBe(400)
    expect((await (await fetch(`${url}/api/donnees`)).json()).app).toBe('coach-12-semaines')
  })
  it('sert le mot du coach quand il existe', async () => {
    expect((await fetch(`${url}/api/coach`)).status).toBe(404)
    writeFileSync(join(donnees, 'coach.json'), JSON.stringify({ date: '2026-10-20', message: 'Allez' }))
    expect((await (await fetch(`${url}/api/coach`)).json()).message).toBe('Allez')
  })
  it('refuse un autre nom d’hôte (DNS rebinding) et une écriture venue d’un autre site', async () => {
    const { request } = await import('node:http')
    const statut = (headers: Record<string, string>, method = 'GET') =>
      new Promise<number>((ok) => {
        const r = request(`${url}/api/donnees`, { method, headers }, (res) => ok(res.statusCode ?? 0))
        r.end(method === 'PUT' ? JSON.stringify(sauvegarde) : undefined)
      })
    expect(await statut({ Host: 'attaquant.example:80' })).toBe(403)
    expect(await statut({ 'Content-Type': 'application/json', Origin: 'https://attaquant.example' }, 'PUT')).toBe(403)
    expect(await statut({ 'Content-Type': 'text/plain' }, 'PUT')).toBe(403)
  })
  it('sert l’app et bloque la sortie du dossier', async () => {
    const r = await fetch(`${url}/`)
    expect(r.headers.get('content-type')).toContain('text/html')
    const t = await (await fetch(`${url}/..%2F..%2Fpackage.json`)).text()
    expect(t).not.toContain('"devDependencies"')
  })
})
