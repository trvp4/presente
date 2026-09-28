'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ouvirPresencas } from '@/lib/supabase/client'
import {
  hm, initials, longDate, statusOf, swatch, timeSP, todayISO, whenText,
  type Attendance, type Project, type Training,
} from '@/lib/format'
import { DateBox, PlusIcon, StatusPill, Underline } from '@/components/ui'
import { CopyButton, QrCanvas, useCountUp } from '@/components/client'

export type Row = Training & { project: Project; count: number }
export type Recent = Pick<Attendance, 'id' | 'training_id' | 'full_name' | 'role' | 'created_at' | 'signature'>

export default function Home({ rows, recent, origin }: { rows: Row[]; recent: Recent[]; origin: string }) {
  const [q, setQ] = useState('')
  const [, tick] = useState(0)
  // reavalia a situação das listas a cada minuto (abrem e fecham sozinhas pelo horário)
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const term = q.toLowerCase().trim()
  const match = (r: Row) => !term || `${r.title} ${r.project.name} ${r.project.pronac} ${r.beneficiary_name ?? ''} ${r.city ?? ''}`.toLowerCase().includes(term)
  const live = rows.filter(r => statusOf(r) === 'live' && match(r))
  const up = rows.filter(r => statusOf(r) === 'sched' && match(r)).sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
  const done = rows.filter(r => statusOf(r) === 'done' && match(r))

  const year = todayISO().slice(0, 4)
  const total = rows.reduce((a, r) => a + r.count, 0)
  const pend = rows.filter(r => statusOf(r) === 'done' && !r.pdf_sent_at && r.count > 0).length

  return (
    <section className="view">
      <div>
        <div className="head">
          <div>
            <h1>Listas de <Underline>presença</Underline></h1>
            <p>Crie a lista da capacitação, compartilhe o link com a turma e acompanhe quem já assinou.</p>
          </div>
          <div className="acts">
            <label className="search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input id="q" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar tema, projeto ou Pronac" aria-label="Buscar listas" />
            </label>
            <Link className="btn btn-dark" href="/listas/nova"><PlusIcon />Criar lista</Link>
          </div>
        </div>
        <div className="summary">
          <span><b>{rows.filter(r => r.date.startsWith(year)).length}</b>listas em {year}</span>
          <span><b>{total}</b>presenças assinadas</span>
          <span><b>{rows.filter(r => statusOf(r) === 'sched').length}</b>próximas</span>
          {pend > 0 && <span style={{ color: 'var(--pink-ink)' }}><b style={{ color: 'var(--pink-ink)' }}>{pend}</b>{pend === 1 ? 'lista ainda não enviada' : 'listas ainda não enviadas'}</span>}
        </div>
      </div>

      <section>
        <div className="sec-title"><h2>Acontecendo agora</h2><span>{longDate(todayISO())}</span></div>
        {live.length ? (
          live.map(r => <LiveCard key={r.id} row={r} initial={recent.filter(a => a.training_id === r.id)} origin={origin} />)
        ) : (
          <div className="none">
            <span className="hand wipe">Nenhuma lista aberta agora…</span>
            <Link className="btn btn-ghost btn-sm" href="/listas/nova">Criar lista</Link>
          </div>
        )}
      </section>

      <section>
        <div className="sec-title"><h2>Próximas</h2><span>O link já pode ser enviado; ele abre 30 minutos antes do encontro.</span></div>
        <div className="cards">
          {up.map(r => (
            <Link key={r.id} className="up" href={`/listas/${r.id}`}>
              <div className="up-top">
                <DateBox iso={r.date} />
                <div style={{ minWidth: 0 }}>
                  <h3>{r.title}</h3>
                  <div className="proj"><span className={`dot ${swatch(r.project.id)}`} />{r.project.name}{r.beneficiary_name ? ` · ${r.beneficiary_name}` : ''}</div>
                </div>
              </div>
              <div className="up-foot"><span>{whenText(r.date)} · {hm(r.start_time)}</span><StatusPill t={r} /></div>
            </Link>
          ))}
          <Link className="new-card" href="/listas/nova"><span className="plus"><PlusIcon size={18} /></span>Criar lista</Link>
        </div>
      </section>

      <section>
        <div className="sec-title"><h2>Encerradas</h2><span>{done.length} {done.length === 1 ? 'lista' : 'listas'}</span></div>
        {done.length ? (
          <div className="done-list">
            {done.map(r => {
              const pct = Math.min(100, Math.round((r.count / r.expected_count) * 100))
              return (
                <Link key={r.id} className="drow" href={`/listas/${r.id}`}>
                  <DateBox iso={r.date} />
                  <div style={{ minWidth: 0 }}>
                    <div className="t">{r.title}</div>
                    <div className="s"><span className={`dot ${swatch(r.project.id)}`} />{r.project.name}{r.beneficiary_name ? ` · ${r.beneficiary_name}` : ''}</div>
                  </div>
                  <div className="pronac mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.project.pronac}</div>
                  <div className="meter"><span>{r.count} de {r.expected_count} presentes</span><div className="bar"><i style={{ width: `${pct}%` }} /></div></div>
                  <div><StatusPill t={r} /></div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="empty">{term ? 'Nenhuma lista encerrada com esse termo.' : 'As listas aparecem aqui depois do encontro.'}</div>
        )}
      </section>
    </section>
  )
}

// Cartão da lista que está recebendo presenças, atualizado em tempo real.
function LiveCard({ row, initial, origin }: { row: Row; initial: Recent[]; origin: string }) {
  const [count, setCount] = useState(row.count)
  const [items, setItems] = useState(initial.slice(0, 3))
  const [fresh, setFresh] = useState<string | null>(null)
  const countRef = useRef<HTMLElement>(null)
  const url = `${origin}/p/${row.code}`

  useEffect(() => ouvirPresencas(row.id, {
    inserida: nova => {
      const { id, training_id, full_name, role, created_at, signature } = nova as Recent
      const a = { id, training_id, full_name, role, created_at, signature } // descarta o CPF
      setItems(prev => [a, ...prev].slice(0, 3))
      setFresh(a.id)
      setCount(c => c + 1)
    },
  }), [row.id])

  // número sobe com um "pulo"
  const shown = useCountUp(count, countRef)
  const pct = Math.min(100, Math.round((count / row.expected_count) * 100))

  return (
    <article className="live">
      <div className="live-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h3>{row.title}</h3>
            <div className="sub"><span className={`dot ${swatch(row.project.id)}`} /> {row.project.name} · {row.beneficiary_name ?? 'Pronac ' + row.project.pronac} · {hm(row.start_time)}–{hm(row.end_time)}</div>
          </div>
          <StatusPill t={row} />
        </div>
        <div>
          <div className="big"><b ref={countRef}>{shown}</b><span>de {row.expected_count} participantes assinaram</span></div>
          <div className="bar" style={{ marginTop: 12 }}><i style={{ width: `${pct}%` }} /></div>
        </div>
        <div>
          <div className="lbl" style={{ marginBottom: 8 }}>Últimas assinaturas</div>
          <ul className="recent">
            {items.length ? items.map(a => (
              <li key={a.id} className={a.id === fresh ? 'slide' : ''}>
                <span className="ini">{initials(a.full_name)}</span>
                <span className="who"><b style={{ fontWeight: 600 }}>{a.full_name}</b> <span style={{ color: 'var(--muted)' }}>· {a.role}</span></span>
                {a.id === fresh && <img className="sig-img wipe" src={a.signature} alt="" />}
                <span className="t mono">{timeSP(a.created_at)}</span>
              </li>
            )) : <li><span className="hand wipe">Ninguém assinou ainda…</span></li>}
          </ul>
        </div>
        <div className="actions-row"><Link className="btn btn-dark" href={`/listas/${row.id}`}>Ver lista completa</Link></div>
      </div>
      <div className="live-side">
        <QrCanvas text={url} animate={false} />
        <div className="lbl">Mostre para a turma</div>
        <div className="url">{url.replace(/^https?:\/\//, '')}</div>
        <CopyButton text={url} className="btn btn-ghost btn-sm" />
      </div>
    </article>
  )
}
