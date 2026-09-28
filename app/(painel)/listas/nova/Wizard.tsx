'use client'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { janelaTexto, longDate, maskCnpjInput, swatch, type Project } from '@/lib/format'
import { CopyButton, QrCanvas } from '@/components/client'
import CityPicker from '@/components/CityPicker'
import { createTraining, type TrainingState } from '../../actions'
import { abertaAte } from '@/lib/capacitacao'

export type School = { name: string; cnpj: string; city: string }
// Item do plano de capacitações que vira esta lista (vem de /plano → "Criar lista")
export type DoPlano = { plano_id: string; project_id: string; title: string; date: string; start: string; school: string; cnpj: string; city: string }

export default function Wizard({ projects, schools, instructors, origin, today, plano }: { projects: Project[]; schools: School[]; instructors: string[]; origin: string; today: string; plano?: DoPlano }) {
  const doPlano = plano && projects.some(x => x.id === plano.project_id) ? plano : undefined
  const [step, setStep] = useState(doPlano ? 2 : 1)
  const [projectId, setProjectId] = useState(doPlano?.project_id ?? projects[0].id)
  const [state, action, pending] = useActionState<TrainingState, FormData>(createTraining, {})
  const [form, setForm] = useState({ title: '', date: today, start: '14:00', end: '16:00', instructor: instructors[0] ?? '', expected: '25', school: '', cnpj: '', city: '', janela: '',
    ...(doPlano && { title: doPlano.title, date: doPlano.date || today, start: doPlano.start || '14:00', end: doPlano.start ? duasHorasDepois(doPlano.start) : '16:00', school: doPlano.school, cnpj: maskCnpjInput(doPlano.cnpj), city: doPlano.city }) })
  const p = projects.find(x => x.id === projectId)!
  const created = Boolean(state.id)
  const current = created ? 3 : step
  const url = state.code ? `${origin}/p/${state.code}` : ''
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const fieldErr = (name: string) => (state.field === name ? state.error : '')
  // escolhendo uma escola já usada antes, CNPJ e cidade vêm juntos
  const setSchool = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const known = schools.find(s => s.name.toLowerCase() === name.trim().toLowerCase())
    setForm(f => ({ ...f, school: name, ...(known ? { cnpj: maskCnpjInput(known.cnpj), city: known.city } : {}) }))
  }

  return (
    <div className="wizard">
      <div className="steps" aria-label={`Passo ${current} de 3`}>
        <div className={current >= 1 ? 'on' : ''}>Projeto</div>
        <div className={current >= 2 ? 'on' : ''}>Encontro</div>
        <div className={current >= 3 ? 'on' : ''}>Link</div>
      </div>

      {current === 1 && (
        <>
          <div className="projs" role="group" aria-label="Projeto">
            {projects.map(x => (
              <button key={x.id} type="button" className="pj" aria-pressed={x.id === projectId} onClick={() => setProjectId(x.id)}>
                {x.logo && <img className="pj-logo" src={x.logo} alt="" />}
                <b><span className={`dot ${swatch(x.id)}`} />{x.name}</b>
                <small>Pronac <span className="mono">{x.pronac}</span></small>
              </button>
            ))}
          </div>
          <div className="step-actions">
            <Link className="linkish" href="/projetos">Cadastrar outro projeto</Link>
            <button className="btn btn-dark" onClick={() => setStep(2)}>Continuar</button>
          </div>
        </>
      )}

      {current === 2 && (
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
          <input type="hidden" name="project_id" value={projectId} />
          {doPlano && <input type="hidden" name="plano_id" value={doPlano.plano_id} />}
          <div className="chosen">
            <span className={`dot ${swatch(p.id)}`} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <b>{p.name}</b>
              <div className="mono">Pronac {p.pronac}</div>
            </div>
            <button type="button" className="linkish" onClick={() => setStep(1)}>Trocar</button>
          </div>
          <div className="grid6">
            <div className={`f ${fieldErr('title') ? 'invalid' : ''}`}>
              <label htmlFor="title">Tema da capacitação</label>
              <input id="title" name="title" value={form.title} onChange={set('title')} placeholder="Ex.: Primeiros socorros para eventos" autoFocus />
              <span className="err">{fieldErr('title')}</span>
            </div>
            <div className={`f ${fieldErr('beneficiary_name') ? 'invalid' : ''}`}>
              <label htmlFor="beneficiary_name">Escola / instituição beneficiada</label>
              <input id="beneficiary_name" name="beneficiary_name" list="schools" value={form.school} onChange={setSchool} placeholder="Ex.: E.E. Maria das Dores" />
              <datalist id="schools">{schools.map(s => <option key={s.name} value={s.name} />)}</datalist>
              <span className="err">{fieldErr('beneficiary_name')}</span>
            </div>
            <div className={`f s3 ${fieldErr('beneficiary_cnpj') ? 'invalid' : ''}`}>
              <label htmlFor="beneficiary_cnpj">CNPJ da escola</label>
              <input id="beneficiary_cnpj" name="beneficiary_cnpj" className="mono" inputMode="numeric" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: maskCnpjInput(e.target.value) }))} />
              <span className="err">{fieldErr('beneficiary_cnpj')}</span>
            </div>
            <div className={`f s3 ${fieldErr('city') ? 'invalid' : ''}`}>
              <label htmlFor="city">Cidade</label>
              <CityPicker value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} invalid={Boolean(fieldErr('city'))} />
              <span className="err">{fieldErr('city')}</span>
            </div>
            <div className={`f s2 ${fieldErr('date') ? 'invalid' : ''}`}>
              <label htmlFor="date">Data</label>
              <input id="date" name="date" type="date" value={form.date} onChange={set('date')} />
              <span className="err">{fieldErr('date')}</span>
            </div>
            <div className="f s2">
              <label htmlFor="start_time">Início do encontro</label>
              <input id="start_time" name="start_time" type="time" value={form.start} onChange={set('start')} />
            </div>
            <div className={`f s2 ${fieldErr('end_time') ? 'invalid' : ''}`}>
              <label htmlFor="end_time">Término do encontro</label>
              <input id="end_time" name="end_time" type="time" value={form.end} onChange={set('end')} />
              <span className="err">{fieldErr('end_time')}</span>
            </div>
            <p className="hint" style={{ gridColumn: 'span 6', margin: '-4px 0 0' }}>
              {/^\d{4}-\d{2}-\d{2}$/.test(form.date) && form.end > form.start &&
               abertaAte({ date: form.date, start_time: form.start, end_time: form.end, keep_open_hours: Number(form.janela) || null }) !== null
                ? <><b>Este encontro já aconteceu.</b> A lista abre assim que for criada e recebe assinaturas por {({ 72: '72 horas', 168: '7 dias' } as Record<string, string>)[form.janela] ?? '48 horas'} (escolha outro prazo em Aceitar assinaturas); depois fecha sozinha.</>
                : janelaTexto(form.date, form.start, form.end, Number(form.janela) || null)}
            </p>
            <div className="f s3">
              <label htmlFor="keep_open_hours">Aceitar assinaturas</label>
              <select id="keep_open_hours" name="keep_open_hours" value={form.janela} onChange={e => setForm(v => ({ ...v, janela: e.target.value }))}>
                <option value="">Só no horário do encontro</option>
                <option value="48">Por 48 horas (para quem vê depois)</option>
                <option value="72">Por 72 horas</option>
                <option value="168">Por 7 dias</option>
              </select>
            </div>
            <div className="f s3">
              <label htmlFor="instructor">Instrutor(a)</label>
              <input id="instructor" name="instructor" value={form.instructor} onChange={set('instructor')} placeholder="Nome de quem conduz" />
              {instructors.length > 0 && (
                <div className="chips" role="group" aria-label="Instrutores cadastrados">
                  {instructors.map(n => (
                    <button key={n} type="button" className="chip" aria-pressed={form.instructor === n} onClick={() => setForm(f => ({ ...f, instructor: n }))}>{n}</button>
                  ))}
                </div>
              )}
            </div>
            <div className={`f s3 ${fieldErr('expected_count') ? 'invalid' : ''}`}>
              <label htmlFor="expected_count">Participantes previstos</label>
              <input id="expected_count" name="expected_count" type="number" min={1} value={form.expected} onChange={set('expected')} />
              <span className="err">{fieldErr('expected_count')}</span>
            </div>
          </div>
          {state.error && !state.field && <div className="err-box" role="alert">{state.error}</div>}
          <div className="step-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Voltar</button>
            <button className="btn btn-dark" disabled={pending}>{pending ? 'Gerando…' : 'Gerar link'}</button>
          </div>
        </form>
      )}

      {current === 3 && state.id && (
        <div className="ready" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <QrCanvas text={url} />
          <h3>Lista criada</h3>
          <p>
            {form.title} · {form.school} · {longDate(form.date)}, {form.start}. Envie o link pelo WhatsApp ou mostre o QR code no dia; ele recebe
            assinaturas de 30 minutos antes até 1 hora depois do encontro.
          </p>
          <div className="urlrow"><span>{url.replace(/^https?:\/\//, '')}</span><CopyButton text={url} label="Copiar" /></div>
          <div className="step-actions" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-ghost" href={`/listas/${state.id}`}>Acompanhar lista</Link>
            <Link className="btn btn-dark" href="/listas">Concluir</Link>
          </div>
        </div>
      )}
    </div>
  )
}

// término sugerido para um item do plano: 2 horas depois do início
function duasHorasDepois(inicio: string) {
  const [h, m] = inicio.split(':').map(Number)
  return `${String(Math.min(23, h + 2)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
