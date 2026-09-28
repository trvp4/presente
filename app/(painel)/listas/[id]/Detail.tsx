'use client'
import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { ouvirPresencas } from '@/lib/supabase/client'
import {
  REALIZACAO, brDate, dayNum, fmtCnpj, hm, initials, maskCpf, monthShort, statusOf, swatch, timeSP, todayISO,
  type Attendance, type Project, type Training,
} from '@/lib/format'
import { StatusPill } from '@/components/ui'
import { CopyButton, QrCanvas, toast, useCountUp } from '@/components/client'
import EditTraining from './EditTraining'
import { deleteTraining, removeAttendance, setPdfSent, setTrainingState } from '../../actions'

type T = Training & { project: Project }

export default function Detail({ training: t, initial, origin, projects }: { training: T; initial: Attendance[]; origin: string; projects: Project[] }) {
  const [list, setList] = useState(initial)
  const [fresh, setFresh] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [confirmRm, setConfirmRm] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [pending, start] = useTransition()
  const countRef = useRef<HTMLElement>(null)
  const status = statusOf(t)
  const url = `${origin}/p/${t.code}`
  const p = t.project

  // presenças chegando e saindo em tempo real
  useEffect(() => ouvirPresencas(t.id, {
    inserida: nova => {
      const raw = nova as Attendance
      const a = { ...raw, cpf: maskCpf(raw.cpf) } // não guarda o CPF completo na tela
      setList(prev => (prev.some(x => x.id === a.id) ? prev : [a, ...prev]))
      setFresh(a.id)
    },
    removida: id => setList(prev => prev.filter(x => x.id !== id)),
  }), [t.id])

  const shown = useCountUp(list.length, countRef)
  const pct = Math.min(100, Math.round((list.length / t.expected_count) * 100))
  const term = q.toLowerCase()
  const filtered = list.filter(a => `${a.full_name} ${a.role}`.toLowerCase().includes(term))

  // lista reaberta pela chave (ou criada depois do encontro): até quando aceita assinaturas
  const aberta = t.state === 'auto' && t.open_until && new Date(t.open_until) > new Date()
    ? new Date(t.open_until).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).replace(',', ' às')
    : ''

  const toggleOpen = () =>
    start(async () => {
      const acao = status === 'live' ? 'encerrar' : 'reabrir'
      await setTrainingState(t.id, acao)
      toast(acao === 'reabrir' ? 'Lista aberta por 48 horas' : 'Lista encerrada')
    })

  const remove = (a: Attendance) => {
    if (confirmRm !== a.id) return setConfirmRm(a.id)
    start(async () => {
      await removeAttendance(a.id, t.id)
      setList(prev => prev.filter(x => x.id !== a.id))
      setConfirmRm(null)
      toast('Presença removida')
    })
  }

  return (
    <section className="view">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Link className="back" href="/listas">← Minhas listas</Link>
        <div className="head">
          <div>
            <div style={{ marginBottom: 10 }}><StatusPill t={t} /></div>
            <h1>{t.title}</h1>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span className={`dot ${swatch(p.id)}`} />{p.name}{t.beneficiary_name ? ` · ${t.beneficiary_name}` : ''}{t.city ? ` · ${t.city}` : ''}</p>
          </div>
          <div className="acts">
            <button className="btn btn-dark" onClick={() => setPdfOpen(true)}>
              {status === 'done' && !t.pdf_sent_at ? 'Gerar lista em Word' : 'Exportar lista em Word'}
            </button>
            <a className="btn btn-ghost" href={`/api/listas/${t.id}/planilha`}>Baixar planilha</a>
            <button className="btn btn-ghost" onClick={() => setEditOpen(true)}>Editar lista</button>
          </div>
        </div>
      </div>

      <div className="detail">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="prog">
            <div className="nums">
              <span className="lbl">Presenças assinadas</span>
              <span><b ref={countRef}>{shown}</b> <span style={{ color: 'var(--muted)' }}>/ {t.expected_count}</span></span>
            </div>
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
          </div>
          <div>
            <div className="att-head">
              <span className="lbl">Lista de presença</span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome ou cargo" aria-label="Buscar na lista" />
            </div>
            <ul className="att">
              {filtered.length ? (
                filtered.map((a, i) => (
                  <li key={a.id} className={a.id === fresh ? 'flash' : ''}>
                    <span className="ini">{initials(a.full_name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="nm">{a.full_name}</div>
                      <div className="cg">{a.role}</div>
                    </div>
                    <div className="rt">
                      <img
                        className="sig-img wipe"
                        style={{ animationDelay: `${a.id === fresh ? 0.15 : Math.min(i, 10) * 0.08 + 0.15}s` }}
                        src={a.signature}
                        alt={`Assinatura de ${a.full_name}`}
                      />
                      <span className="mono">{maskCpf(a.cpf)} · {timeSP(a.created_at)}</span>
                    </div>
                    <button className={`rm ${confirmRm === a.id ? 'confirm' : ''}`} onClick={() => remove(a)} disabled={pending} onBlur={() => setConfirmRm(null)}>
                      {confirmRm === a.id ? 'Confirmar remoção' : 'Remover'}
                    </button>
                  </li>
                ))
              ) : (
                <li style={{ display: 'block', border: 0 }}>
                  <div className="empty">
                    {list.length ? 'Ninguém encontrado com esse termo.' : (
                      <><span className="hand wipe">Ainda sem assinaturas…</span><br />Envie o link ou mostre o QR code para a turma no início do encontro.</>
                    )}
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>

        <aside className="detail-side">
          {status !== 'done' && (
            <div className="linkbox">
              <QrCanvas text={url} />
              <span className="lbl">Link de presença</span>
              <div className="url">{url.replace(/^https?:\/\//, '')}</div>
              <div className="acts">
                <CopyButton text={url} />
                <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">Abrir como voluntário</a>
              </div>
            </div>
          )}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="switch">
              <button role="switch" aria-checked={status === 'live'} aria-label="Aceitando presenças" onClick={toggleOpen} disabled={pending} />
              <span>
                {status === 'live' ? 'Aceitando presenças agora' : status === 'done' ? 'Lista encerrada' : 'Abre 30 min antes do encontro'}
                <small>
                  {status === 'live'
                    ? (aberta ? `Aberta até ${aberta}; desligue para encerrar antes.` : 'Desligue para encerrar a lista.')
                    : 'Ligue para abrir por 48 horas; depois ela fecha sozinha.'}
                </small>
              </span>
            </div>
            {(t.state !== 'auto' || t.open_until) && (
              <button className="linkish" style={{ alignSelf: 'flex-start' }} disabled={pending}
                onClick={() => start(async () => { await setTrainingState(t.id, 'horario'); toast('A lista volta a abrir e fechar pelo horário') })}>
                Voltar a abrir e fechar pelo horário
              </button>
            )}
            <dl className="meta">
              <div><dt>Pronac</dt><dd className="mono">{p.pronac}</dd></div>
              <div><dt>Escola</dt><dd>{t.beneficiary_name || '—'}</dd></div>
              <div><dt>CNPJ da escola</dt><dd className="mono">{t.beneficiary_cnpj ? fmtCnpj(t.beneficiary_cnpj) : '—'}</dd></div>
              <div><dt>Cidade</dt><dd>{t.city || '—'}</dd></div>
              <div><dt>Data</dt><dd>{dayNum(t.date)} {monthShort(t.date)} · {hm(t.start_time)}–{hm(t.end_time)}</dd></div>
              <div><dt>Instrutor(a)</dt><dd>{t.instructor || '—'}</dd></div>
              <div><dt>Envio da lista</dt><dd>{t.pdf_sent_at ? `Enviado em ${brDate(t.pdf_sent_at.slice(0, 10))}` : 'Não enviado'}</dd></div>
            </dl>
            {t.pdf_sent_at && (
              <button className="linkish" style={{ alignSelf: 'flex-start' }} disabled={pending}
                onClick={() => start(async () => { await setPdfSent(t.id, false); toast('Marcado como não enviado') })}>
                Desmarcar lista enviada
              </button>
            )}
            <button className={`linkish`} style={{ alignSelf: 'flex-start', color: confirmDel ? 'var(--bad)' : 'var(--muted)' }} disabled={pending}
              onBlur={() => setConfirmDel(false)}
              onClick={() => (confirmDel ? start(() => deleteTraining(t.id)) : setConfirmDel(true))}>
              {confirmDel ? `Confirmar: excluir a lista e as ${list.length} assinaturas` : 'Excluir lista'}
            </button>
          </div>
        </aside>
      </div>

      {pdfOpen && <PdfFx t={t} list={list} onClose={() => setPdfOpen(false)} />}
      {editOpen && <EditTraining t={t} projects={projects} onClose={() => setEditOpen(false)} />}
    </section>
  )
}

// Folha sendo preenchida, com carimbo no final.
function PdfFx({ t, list, onClose }: { t: T; list: Attendance[]; onClose: () => void }) {
  const [pending, start] = useTransition()
  const rows = list.slice().reverse()
  const show = rows.slice(0, 9)
  const step = 0.2, t0 = 0.55
  const end = t0 + show.length * step + (rows.length > show.length ? step : 0) + 0.35
  const sent = Boolean(t.pdf_sent_at)
  const p = t.project

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="pdf-fx" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pdf-stage">
        <div className="paper" role="img" aria-label="Pré-visualização da lista em Word">
          {p.logo && <img className="paper-logo" src={p.logo} alt="" />}
          <h4>Lista de presença – Capacitação</h4>
          <div className="pmeta">
            <div><span>Projeto:</span> {p.name} · Pronac {p.pronac}</div><div><span>Realização:</span> {REALIZACAO}</div>
            <div><span>Instituição:</span> {t.beneficiary_name || '—'}</div><div><span>Cidade:</span> {t.city || '—'}</div>
            <div><span>Data:</span> {brDate(t.date)}</div><div><span>Horário:</span> {hm(t.start_time)} às {hm(t.end_time)}</div>
          </div>
          <div className="prow hd"><span>Nº</span><span>Nome</span><span className="cg">Cargo</span><span>CPF</span><span>Assinatura</span></div>
          {show.length ? show.map((a, i) => (
            <div key={a.id} className="prow" style={{ ['--d' as string]: `${t0 + i * step}s` }}>
              <span>{i + 1}</span><span>{a.full_name}</span><span className="cg">{a.role}</span><span className="mono">{maskCpf(a.cpf)}</span>
              <img src={a.signature} alt="" />
            </div>
          )) : <div className="more" style={{ ['--d' as string]: `${t0}s` }}>Nenhuma presença registrada.</div>}
          {rows.length > show.length && (
            <div className="more" style={{ ['--d' as string]: `${t0 + show.length * step}s` }}>+ {rows.length - show.length} participantes nas próximas linhas</div>
          )}
          <div className="stamp" style={{ ['--d' as string]: `${end}s` }}>
            {sent ? 'ENVIADO' : 'GERADO'}<small>{brDate(todayISO())}</small>
          </div>
        </div>
        <div className="pdf-cap" style={{ ['--d' as string]: `${end + 0.45}s` }}>
          {rows.length} {rows.length === 1 ? 'assinatura' : 'assinaturas'} na lista.
          <div className="row">
            <a className="btn btn-pink" href={`/api/listas/${t.id}/docx`} download onClick={() => toast('Baixando a lista em Word (.docx)')}>Baixar lista em Word (.docx)</a>
            {!sent && (
              <button className="btn btn-ghost" disabled={pending}
                onClick={() => start(async () => { await setPdfSent(t.id, true); toast('Lista marcada como enviada'); onClose() })}>
                Marcar como enviado
              </button>
            )}
            <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
