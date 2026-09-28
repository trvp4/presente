'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Logo } from '@/components/client'
import { Icone, PlusIcon, type NomeIcone } from '@/components/ui'
import { signOut } from '../login/actions'

// Cada módulo tem o próprio menu (ADR 0008): Central → Presente (rosa) ou Espaços de Leitura (lilás).
export default function RailNav({ email, name }: { email: string; name: string | null }) {
  const path = usePathname()
  const mod = path === '/' ? 'central' : path.startsWith('/espacos') ? 'espacos' : 'presente'
  const item = (href: string, icone: NomeIcone, dica: string, atual: boolean) => (
    <Link className="rail-btn" href={href} aria-current={atual ? 'page' : undefined} aria-label={dica}>
      <Icone nome={icone} /><span className="tip">{dica}</span>
    </Link>
  )
  const voltar = (
    <>
      <Link className="rail-btn back" href="/" aria-label="Voltar à Central"><Icone nome="central" /><span className="tip">Voltar à Central</span></Link>
      <div className="sep" />
    </>
  )
  return (
    <nav className="rail" data-mod={mod} aria-label="Navegação principal">
      <Logo />
      {mod === 'central' && (
        <>
          {item('/', 'central', 'Central', true)}
          <div className="sep" />
          {item('/listas', 'listas', 'Abrir o Presente', false)}
          {item('/espacos', 'livro', 'Abrir o Espaços de Leitura', false)}
        </>
      )}
      {mod === 'presente' && (
        <>
          {voltar}
          {item('/listas', 'listas', 'Listas de presença', path.startsWith('/listas') && path !== '/listas/nova')}
          {item('/plano', 'mes', 'Plano de capacitações', path.startsWith('/plano'))}
          {item('/projetos', 'projetos', 'Projetos', path.startsWith('/projetos'))}
          {item('/avaliacoes', 'avaliacoes', 'Avaliações', path.startsWith('/avaliacoes'))}
          <Link className="rail-btn pink" href="/listas/nova" aria-current={path === '/listas/nova' ? 'page' : undefined} aria-label="Criar lista">
            <PlusIcon size={20} />
            <span className="tip">Criar lista</span>
          </Link>
        </>
      )}
      {mod === 'espacos' && (
        <>
          {voltar}
          {item('/espacos', 'mes', 'Mês', path === '/espacos')}
          {item('/espacos/revisao', 'revisao', 'Revisão', path.startsWith('/espacos/revisao'))}
          {item('/espacos/escolas', 'escolas', 'Escolas', path.startsWith('/espacos/escolas'))}
          {item('/espacos/relatorios', 'relatorios', 'Relatórios por patrocinador', path.startsWith('/espacos/relatorios'))}
        </>
      )}
      <div className="spacer" />
      <AccountMenu email={email} name={name} />
    </nav>
  )
}

// Clique no avatar abre um menu com o nome da pessoa; "Sair" só acontece ao confirmar ali.
function AccountMenu({ email, name }: { email: string; name: string | null }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const label = name ?? email
  return (
    <div className="account" ref={box}>
      <button className="me" aria-haspopup="menu" aria-expanded={open} aria-label={`Conta de ${label}`} onClick={() => setOpen(o => !o)}>
        {label.slice(0, 2).toUpperCase()}
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <div className="who">
            <b>{label}</b>
            <span>{email.endsWith('@presente.app') ? `usuário: ${email.split('@')[0]}` : email}</span>
          </div>
          <form action={signOut}>
            <button className="btn btn-ghost btn-sm" role="menuitem" style={{ width: '100%' }}>Sair do sistema</button>
          </form>
        </div>
      )}
    </div>
  )
}
