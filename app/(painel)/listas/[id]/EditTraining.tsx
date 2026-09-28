'use client'
import { useEffect, useState, useTransition } from 'react'
import { hm, janelaTexto, maskCnpjInput, type Project, type Training } from '@/lib/format'
import CityPicker from '@/components/CityPicker'
import { toast } from '@/components/client'
import { updateTraining } from '../../actions'

// Janela para corrigir os dados da lista. O link, o QR code e as assinaturas continuam os mesmos.
export default function EditTraining({ t, projects, onClose }: { t: Training; projects: Project[]; onClose: () => void }) {
  const [f, setF] = useState({
    project_id: t.project_id,
    title: t.title,
    beneficiary_name: t.beneficiary_name ?? '',
    beneficiary_cnpj: maskCnpjInput(t.beneficiary_cnpj ?? ''),
    city: t.city ?? '',
    date: t.date,
    start_time: hm(t.start_time),
    end_time: hm(t.end_time),
    instructor: t.instructor ?? '',
    expected_count: String(t.expected_count),
    keep_open_hours: t.keep_open_hours ? String(t.keep_open_hours) : '',
  })
  const [erro, setErro] = useState<{ field?: string; error?: string }>({})
  const [pending, start] = useTransition()
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(v => ({ ...v, [k]: e.target.value }))
  const msg = (k: string) => (erro.field === k ? erro.error : '')

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const salvar = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const r = await updateTraining(t.id, f)
      if (r.error) return setErro(r)
      toast('Lista corrigida — o link continua o mesmo')
      onClose()
    })
  }

  // o projeto atual aparece mesmo se estiver arquivado
  const opcoes = projects.filter(p => !p.archived || p.id === t.project_id)

  return (
    <div className="pdf-fx" onClick={e => e.target === e.currentTarget && onClose()}>
      <form className="wizard edit-sheet" onSubmit={salvar} noValidate role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <h2 id="edit-title" style={{ margin: 0, fontSize: 22, letterSpacing: '-.02em' }}>Editar lista</h2>
            <p className="hint" style={{ margin: '4px 0 0' }}>O link, o QR code e as assinaturas continuam os mesmos.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="grid6">
          <div className="f">
            <label htmlFor="e-project">Projeto</label>
            <select id="e-project" value={f.project_id} onChange={set('project_id')}>
              {opcoes.map(p => <option key={p.id} value={p.id}>{p.name} · Pronac {p.pronac}</option>)}
            </select>
          </div>
          <div className={`f ${msg('title') ? 'invalid' : ''}`}>
            <label htmlFor="e-title">Tema da capacitação</label>
            <input id="e-title" value={f.title} onChange={set('title')} />
            <span className="err">{msg('title')}</span>
          </div>
          <div className={`f ${msg('beneficiary_name') ? 'invalid' : ''}`}>
            <label htmlFor="e-school">Escola / instituição beneficiada</label>
            <input id="e-school" value={f.beneficiary_name} onChange={set('beneficiary_name')} />
            <span className="err">{msg('beneficiary_name')}</span>
          </div>
          <div className={`f s3 ${msg('beneficiary_cnpj') ? 'invalid' : ''}`}>
            <label htmlFor="e-cnpj">CNPJ da escola</label>
            <input id="e-cnpj" className="mono" inputMode="numeric" value={f.beneficiary_cnpj} onChange={e => setF(v => ({ ...v, beneficiary_cnpj: maskCnpjInput(e.target.value) }))} />
            <span className="err">{msg('beneficiary_cnpj')}</span>
          </div>
          <div className={`f s3 ${msg('city') ? 'invalid' : ''}`}>
            <label htmlFor="e-city">Cidade</label>
            <CityPicker id="e-city" name="city" value={f.city} onChange={v => setF(x => ({ ...x, city: v }))} invalid={Boolean(msg('city'))} />
            <span className="err">{msg('city')}</span>
          </div>
          <div className={`f s2 ${msg('date') ? 'invalid' : ''}`}>
            <label htmlFor="e-date">Data</label>
            <input id="e-date" type="date" value={f.date} onChange={set('date')} />
            <span className="err">{msg('date')}</span>
          </div>
          <div className="f s2">
            <label htmlFor="e-start">Início do encontro</label>
            <input id="e-start" type="time" value={f.start_time} onChange={set('start_time')} />
          </div>
          <div className={`f s2 ${msg('end_time') ? 'invalid' : ''}`}>
            <label htmlFor="e-end">Término do encontro</label>
            <input id="e-end" type="time" value={f.end_time} onChange={set('end_time')} />
            <span className="err">{msg('end_time')}</span>
          </div>
          <p className="hint" style={{ gridColumn: 'span 6', margin: '-4px 0 0' }}>{janelaTexto(f.date, f.start_time, f.end_time, Number(f.keep_open_hours) || null)}</p>
          <div className="f s3">
            <label htmlFor="e-janela">Aceitar assinaturas</label>
            <select id="e-janela" name="keep_open_hours" value={f.keep_open_hours} onChange={set('keep_open_hours')}>
              <option value="">Só no horário do encontro</option>
              <option value="48">Por 48 horas (para quem vê depois)</option>
              <option value="72">Por 72 horas</option>
              <option value="168">Por 7 dias</option>
            </select>
          </div>
          <div className="f s3">
            <label htmlFor="e-instr">Instrutor(a)</label>
            <input id="e-instr" value={f.instructor} onChange={set('instructor')} />
          </div>
          <div className={`f s3 ${msg('expected_count') ? 'invalid' : ''}`}>
            <label htmlFor="e-count">Participantes previstos</label>
            <input id="e-count" type="number" min={1} value={f.expected_count} onChange={set('expected_count')} />
            <span className="err">{msg('expected_count')}</span>
          </div>
        </div>
        {erro.error && !erro.field && <div className="err-box" role="alert">{erro.error}</div>}
        <div className="step-actions" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-dark" disabled={pending}>{pending ? 'Salvando…' : 'Salvar correção'}</button>
        </div>
      </form>
    </div>
  )
}
