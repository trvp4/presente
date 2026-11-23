'use client'
import { useTransition } from 'react'
import { toast } from '@/components/client'
import { conferirAgora, mudarAchado } from './actions'

export function ConferirAgora() {
  const [pending, start] = useTransition()
  return (
    <button type="button" className="btn btn-dark btn-sm" disabled={pending}
      onClick={() => start(async () => { const r = await conferirAgora(); toast(r.error ?? r.resumo ?? 'Conferido') })}>
      {pending ? 'Conferindo…' : 'Conferir agora'}
    </button>
  )
}

export function AcoesDoAchado({ id, estado }: { id: string; estado: string }) {
  const [pending, start] = useTransition()
  const mudar = (novo: 'aberto' | 'resolvido' | 'ignorado', msg: string) =>
    start(async () => { const r = await mudarAchado(id, novo); toast(r.error ?? msg) })
  if (estado === 'resolvido' || estado === 'ignorado') {
    return <button type="button" className="linkish" disabled={pending} onClick={() => mudar('aberto', 'Achado reaberto')}>Reabrir</button>
  }
  return (
    <div className="sd-acoes">
      <button type="button" className="btn btn-pink btn-sm" disabled={pending} onClick={() => mudar('resolvido', 'Marcado como resolvido')}>
        {pending ? 'Salvando…' : 'Marcar como resolvido'}
      </button>
      <button type="button" className="linkish" disabled={pending} onClick={() => mudar('ignorado', 'Achado ignorado: não volta a abrir sozinho')}>Ignorar</button>
    </div>
  )
}
