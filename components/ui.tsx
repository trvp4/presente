// Peças visuais sem estado, usadas no servidor e no navegador.
import { dayNum, monthShort, statusOf, type Training } from '@/lib/format'

export function SignatureMark({ size = 50, delay = 0.25, id }: { size?: number; delay?: number; id?: string }) {
  return (
    <svg
      id={id}
      className="write"
      style={{ ['--d' as string]: `${delay}s`, ['--dur' as string]: '1.4s' }}
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      aria-hidden="true"
    >
      <path
        pathLength={1}
        d="M6 34c6-2 10-10 12-18c1-5-4-5-5 0c-2 8 0 18 6 18c5 0 7-8 10-12c2-3 4-2 4 1c0 4 2 6 6 4"
        stroke="#fff"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="45.5" cy="24.5" r="3.6" fill="var(--pink)" />
    </svg>
  )
}

export function Underline({ children, cor = 'var(--pink)' }: { children: React.ReactNode; cor?: string }) {
  return (
    <span className="uline">
      {children}
      <svg
        className="write"
        style={{ ['--d' as string]: '.5s', ['--dur' as string]: '.9s' }}
        viewBox="0 0 200 14"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path pathLength={1} d="M3 9C40 4 80 12 120 7S178 3 197 8" stroke={cor} strokeWidth={5} strokeLinecap="round" fill="none" />
      </svg>
    </span>
  )
}

export function StatusPill({ t }: { t: Training }) {
  const st = statusOf(t)
  if (st === 'live') return <span className="st st-live">Recebendo presenças</span>
  if (st === 'sched') return <span className="st st-sched">Link pronto</span>
  if (t.pdf_sent_at)
    return (
      <span className="st st-ok">
        <svg className="write" style={{ ['--d' as string]: '.2s', ['--dur' as string]: '.45s' }} width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path pathLength={1} d="M2 6.5l2.6 2.6L10 3" />
        </svg>
        Lista enviada
      </span>
    )
  return <span className="st st-pend">Falta enviar a lista</span>
}

export function DateBox({ iso }: { iso: string }) {
  return (
    <div className="date">
      <b>{dayNum(iso)}</b>
      <small>{monthShort(iso)}</small>
    </div>
  )
}

export function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

// Ícones da barra lateral e das portas da Central
const ICON = {
  central: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  listas: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></>,
  projetos: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  avaliacoes: <path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />,
  livro: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /><path d="M9 8h7M9 12h5" /></>,
  mes: <><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></>,
  revisao: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>,
  escolas: <><path d="M3 10l9-6 9 6" /><path d="M5 10v9h14v-9" /><path d="M10 19v-5h4v5" /></>,
  relatorios: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
}
export type NomeIcone = keyof typeof ICON
export function Icone({ nome, size = 20 }: { nome: NomeIcone; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICON[nome]}</svg>
}
