'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { fileToLogo, toast } from '@/components/client'
import { createProject, type ProjectState } from '../actions'

export default function NewProject() {
  const [state, action, pending] = useActionState<ProjectState, FormData>(createProject, {})
  const [logo, setLogo] = useState('')
  const [logoErr, setLogoErr] = useState('')
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset()
      setLogo('')
      toast('Projeto cadastrado')
    }
  }, [state])

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    try { setLogo(await fileToLogo(f)); setLogoErr('') } catch (err) { setLogoErr((err as Error).message) }
  }

  return (
    <form ref={ref} action={action} className="card" noValidate>
      <input type="hidden" name="logo" value={logo} />
      <div className="grid6">
        <div className="f s3"><label htmlFor="name">Nome do projeto</label><input id="name" name="name" placeholder="Ex.: Biblioteca Futuro" required /></div>
        <div className="f s3"><label htmlFor="pronac">Pronac</label><input id="pronac" name="pronac" className="mono" inputMode="numeric" required /></div>
        <div className="f">
          <label htmlFor="logoFile">Logo do projeto (vai no topo da lista em Word)</label>
          <div className="logo-pick">
            {logo ? <img src={logo} alt="Logo escolhido" /> : <span>Sem logo</span>}
            <input id="logoFile" type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} />
          </div>
          <span className="err">{logoErr}</span>
        </div>
      </div>
      {state.error && <div className="err-box" role="alert" style={{ marginTop: 14 }}>{state.error}</div>}
      <div className="step-actions" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
        <button className="btn btn-dark" disabled={pending}>{pending ? 'Salvando…' : 'Cadastrar projeto'}</button>
      </div>
    </form>
  )
}
