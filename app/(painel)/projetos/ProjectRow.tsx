'use client'
import { useState, useTransition } from 'react'
import { swatch, type Project } from '@/lib/format'
import { toast } from '@/components/client'
import { deleteProject, setProjectArchived, updateProject } from '../actions'
import LogoButton from './LogoButton'

// Uma linha da lista de Projetos: ver, corrigir, trocar logo, excluir (sem listas) ou arquivar (com listas).
export default function ProjectRow({ p, listas }: { p: Project; listas: number }) {
  const [editando, setEditando] = useState(false)
  const [name, setName] = useState(p.name)
  const [pronac, setPronac] = useState(p.pronac ?? '')
  const [erro, setErro] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const [pending, start] = useTransition()

  const salvar = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const r = await updateProject(p.id, { name, pronac })
      if (r.error) return setErro(r.error)
      setErro('')
      setEditando(false)
      toast('Projeto corrigido')
    })
  }

  const excluir = () => {
    if (!confirmar) return setConfirmar(true)
    start(async () => {
      const r = await deleteProject(p.id)
      setConfirmar(false)
      toast(r.error ?? 'Projeto excluído')
    })
  }

  const arquivar = (archived: boolean) =>
    start(async () => {
      await setProjectArchived(p.id, archived)
      toast(archived ? 'Projeto arquivado: não aparece mais na criação de listas' : 'Projeto reativado')
    })

  if (editando) {
    return (
      <form className="prow-p editing" onSubmit={salvar}>
        <div className="f" style={{ gap: 4 }}>
          <label htmlFor={`n-${p.id}`}>Nome do projeto</label>
          <input id={`n-${p.id}`} value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <div className="f" style={{ gap: 4 }}>
          <label htmlFor={`p-${p.id}`}>Pronac</label>
          <input id={`p-${p.id}`} className="mono" inputMode="numeric" value={pronac} onChange={e => setPronac(e.target.value)} />
        </div>
        <div className="row-acts" style={{ gridColumn: 'span 2' }}>
          {erro && <span className="err" role="alert">{erro}</span>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditando(false); setName(p.name); setPronac(p.pronac ?? ''); setErro('') }}>Cancelar</button>
          <button className="btn btn-dark btn-sm" disabled={pending}>{pending ? 'Salvando…' : 'Salvar correção'}</button>
        </div>
      </form>
    )
  }

  return (
    <div className={`prow-p ${p.archived ? 'archived' : ''}`}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
        <span className={`dot ${swatch(p.id)}`} /><b>{p.name}</b>
        {p.archived && <span className="st st-done">Arquivado</span>}
      </div>
      <span className="mono">{p.pronac ?? 'sem Pronac'}</span>
      <span className="plogo hide-sm">{p.logo ? <img src={p.logo} alt={`Logo ${p.name}`} /> : <span style={{ color: 'var(--faint)' }}>Sem logo</span>}</span>
      <div className="row-acts">
        <button type="button" className="linkish" onClick={() => setEditando(true)}>Editar</button>
        <LogoButton id={p.id} hasLogo={Boolean(p.logo)} />
        {listas > 0 ? (
          <button type="button" className="linkish" disabled={pending} onClick={() => arquivar(!p.archived)}
            title={`${listas} ${listas === 1 ? 'lista usa' : 'listas usam'} este projeto, por isso ele não pode ser excluído`}>
            {p.archived ? 'Reativar' : 'Arquivar'}
          </button>
        ) : (
          <button type="button" className={`linkish ${confirmar ? 'danger' : ''}`} disabled={pending} onClick={excluir} onBlur={() => setConfirmar(false)}>
            {confirmar ? 'Confirmar exclusão' : 'Excluir'}
          </button>
        )}
      </div>
    </div>
  )
}
