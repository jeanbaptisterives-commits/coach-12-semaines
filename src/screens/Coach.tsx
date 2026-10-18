import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { enArtefact, lireConversation } from '../db/cloud'
import { parlerAuCoach } from '../db/coachService'
import type { MessageCoach } from '../types'
import { Bouton } from '../components/ui'

const SUGGESTIONS = ['Quelle séance tu me conseilles aujourd’hui ?', 'Je suis crevé, on fait quoi ?', 'J’ai une gêne à l’épaule', 'Je veux plus de cardio', 'Pas motivé ce matin']

// Conversation avec le coach : chaque réponse tient compte de toutes tes données, et peut ajuster la séance du jour.
export function Coach() {
  const nav = useNavigate()
  const [fil, setFil] = useState<MessageCoach[]>([])
  const [texte, setTexte] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [info, setInfo] = useState('')
  const bas = useRef<HTMLDivElement>(null)

  useEffect(() => {
    lireConversation().then(setFil)
  }, [])
  useEffect(() => {
    bas.current?.scrollIntoView({ block: 'end' })
  }, [fil.length, occupe])

  async function envoyer(message: string) {
    const t = message.trim()
    if (!t || occupe) return
    const nouveau: MessageCoach[] = [...fil, { role: 'moi', texte: t, le: new Date().toISOString() }]
    setFil(nouveau)
    setTexte('')
    setInfo('')
    setOccupe(true)
    const r = await parlerAuCoach(nouveau)
    setOccupe(false)
    if ('erreur' in r) {
      setInfo(r.erreur)
      return
    }
    setFil([...nouveau, { role: 'coach', texte: r.reponse, le: new Date().toISOString() }])
    if (r.ajustement) setInfo(`Séance du jour ajustée : ${r.ajustement}`)
  }

  if (!enArtefact()) {
    return (
      <div className="space-y-4 pt-2">
        <h1 className="text-4xl">Coach</h1>
        <p className="text-ivoire2">Le coach répond dans l’artefact Claude. Ouvre l’app depuis Claude pour lui parler.</p>
        <Link to="/" className="text-sauge-clair underline underline-offset-4">
          Retour
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col gap-4 pt-2">
      <header className="flex items-end justify-between">
        <h1 className="text-4xl">Coach</h1>
        <button type="button" onClick={() => nav('/')} className="min-h-11 text-ivoire2">
          Fermer
        </button>
      </header>
      <div className="flex-1 space-y-3">
        {fil.length === 0 && (
          <p className="rounded-3xl bg-carte p-4 text-ivoire2">
            Dis-moi comment tu te sens, ce dont tu as envie, ou pose une question technique. Je connais tes séances, ton sommeil et ta conso, et je peux ajuster la séance du jour.
          </p>
        )}
        {fil.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'moi' ? 'justify-end' : 'justify-start'}`}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 leading-relaxed ${m.role === 'moi' ? 'rounded-br-md bg-dore text-fond' : 'rounded-bl-md bg-carte text-ivoire'}`}
            >
              {m.texte}
            </p>
          </div>
        ))}
        {occupe && <p className="w-fit rounded-3xl rounded-bl-md bg-carte px-4 py-3 text-ivoire2">Le coach réfléchit…</p>}
        {info && <p className="rounded-2xl bg-sauge/20 px-4 py-2 text-sm text-sauge-clair">{info}</p>}
        <div ref={bas} />
      </div>
      {fil.length < 2 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => envoyer(s)} className="min-h-11 shrink-0 rounded-full bg-carte px-4 text-sm text-ivoire/85">
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="sticky bottom-24 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          envoyer(texte)
        }}
      >
        <label htmlFor="message-coach" className="sr-only">
          Message au coach
        </label>
        <textarea
          id="message-coach"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              envoyer(texte)
            }
          }}
          rows={1}
          placeholder="Écris au coach"
          className="min-h-14 flex-1 resize-none rounded-2xl bg-carte px-4 py-4 text-lg placeholder:text-ivoire3"
        />
        <Bouton type="submit" disabled={occupe || !texte.trim()}>
          Envoyer
        </Bouton>
      </form>
    </div>
  )
}
