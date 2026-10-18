import { describe, expect, it } from 'vitest'
import { LIB, PROFIL } from './fixtures'
import { promptConversation, resumerDonnees, validerConsignes } from './coach'

const d = { lib: LIB, profil: PROFIL }
describe('validation des consignes du coach', () => {
  it('garde le message et une consigne sûre', () => {
    const c = validerConsignes({ message: 'Grosse nuit — on allège.', seance: { alleger: true } }, d, '2026-10-20')
    expect(c).toEqual({ date: '2026-10-20', message: 'Grosse nuit , on allège.', seance: { alleger: true } })
  })
  it('refuse un remplacement dangereux pour les épaules et une charge non possédée', () => {
    const c = validerConsignes({ message: 'ok', seance: { remplacer: [{ de: 'pompes', par: 'kb_press' }, { de: 'pompes', par: 'pompes_genoux' }] }, reglages: { charges: { kb_swing: 14, kb_goblet_squat: 12 } } }, d, 'x')
    expect(c?.seance?.remplacer).toEqual([{ de: 'pompes', par: 'pompes_genoux' }])
    expect(c?.reglages?.charges).toEqual({ kb_goblet_squat: 12 })
  })
  it('refuse la haute intensité et les tractions sans barre', () => {
    const c = validerConsignes({ message: 'ok', seance: { remplacer: [{ de: 'pompes', par: 'jump_squat' }, { de: 'tirage_inverse_table', par: 'tractions' }] } }, d, 'x')
    expect(c?.seance).toBeUndefined()
  })
  it('réponse vide ou mal formée : rien', () => {
    expect(validerConsignes({}, d, 'x')).toBeNull()
    expect(validerConsignes('n’importe quoi', d, 'x')).toBeNull()
  })
  it('course : bornes respectées', () => {
    expect(validerConsignes({ message: 'ok', reglages: { course: { courseSec: 90, marcheSec: 60, blocs: 6, continueMin: 0 } } }, d, 'x')?.reglages?.course).toBeDefined()
    expect(validerConsignes({ message: 'ok', reglages: { course: { courseSec: 90, marcheSec: 60, blocs: 6, continueMin: 60 } } }, d, 'x')?.reglages).toBeUndefined()
  })
  it('conversation : champ reponse', () => {
    expect(validerConsignes({ reponse: 'Vas-y doucement.' }, d, 'x', 'reponse')?.message).toBe('Vas-y doucement.')
  })
})

describe('résumé et conversation', () => {
  it('le résumé contient le profil et la liste des remplacements sûrs', () => {
    const r = resumerDonnees({ profil: PROFIL, journal: [{ date: '2026-10-19', joints: 4, mode: 'joint_tabac' }], seances: [], etats: [], pesees: [], tests: [], lib: LIB }, '2026-10-20')
    expect(r).toContain('kettlebells 8/12/16/20 kg')
    expect(r).toContain('joints 4 (joint_tabac)')
    expect(r).not.toMatch(/kb_press/)
  })
  it('la conversation finit sur un message de JB', () => {
    const m = promptConversation('résumé', [{ role: 'moi', texte: 'pas motivé', le: 'x' }])
    expect(m.at(-1)).toEqual({ role: 'user', content: 'pas motivé' })
  })
})
