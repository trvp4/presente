import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { REALIZACAO, fmtCnpj, hm, longDate, statusOf, type Project, type Training } from '@/lib/format'
import { SignatureMark } from '@/components/ui'
import SignForm from './SignForm'

export const metadata = { title: 'Lista de presença', robots: { index: false, follow: false } }

// Página pública que o voluntário abre pelo link ou QR code.
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  if (!/^[A-Z0-9]{6}$/.test(code)) notFound()
  const admin = createAdminClient()
  const { data } = await admin
    .from('trainings')
    .select('id, title, date, start_time, end_time, instructor, state, keep_open_hours, code, beneficiary_name, beneficiary_cnpj, city, project:projects(name, pronac)')
    .eq('code', code)
    .maybeSingle()
  if (!data) notFound()
  const t = data as unknown as Pick<Training, 'id' | 'title' | 'date' | 'start_time' | 'end_time' | 'instructor' | 'state' | 'keep_open_hours' | 'code' | 'beneficiary_name' | 'beneficiary_cnpj' | 'city'> & {
    project: Pick<Project, 'name' | 'pronac'>
  }
  const status = statusOf(t)

  return (
    <main className="vol">
      <div className="vol-inner">
        <div className="v-brand"><SignatureMark size={30} />Presente</div>
        <header className="v-head">
          <div className="eyebrow">Lista de presença · capacitação</div>
          <h1>{t.title}</h1>
          <div className="when">{longDate(t.date)} · {hm(t.start_time)}–{hm(t.end_time)}{t.instructor ? ` · ${t.instructor}` : ''}</div>
          <div className="v-meta">
            <div style={{ gridColumn: 'span 2' }}><small>Projeto</small><span>{t.project.name}</span></div>
            <div><small>Pronac</small><span className="mono">{t.project.pronac}</span></div>
            <div><small>Cidade</small><span>{t.city || '—'}</span></div>
            <div style={{ gridColumn: 'span 2' }}><small>Instituição beneficiada</small><span>{t.beneficiary_name || '—'}{t.beneficiary_cnpj ? ` · CNPJ ${fmtCnpj(t.beneficiary_cnpj)}` : ''}</span></div>
            <div style={{ gridColumn: 'span 2' }}><small>Realização</small><span>{REALIZACAO}</span></div>
          </div>
        </header>

        {status === 'live' ? (
          <SignForm code={t.code} title={t.title} pronac={t.project.pronac ?? ''} />
        ) : status === 'sched' ? (
          <div className="done-screen">
            <span className="hand wipe">A lista ainda não abriu…</span>
            <p>Ela abre 30 minutos antes do encontro, no dia {longDate(t.date)}. Volte a este link na hora da capacitação.{t.keep_open_hours ? ` Depois de aberta, ela aceita assinaturas por ${t.keep_open_hours / 24} dias a partir do início.` : ''}</p>
          </div>
        ) : (
          <div className="done-screen">
            <span className="hand wipe">Esta lista já foi encerrada.</span>
            <p>Fale com a pessoa responsável pela capacitação se você participou e não assinou.</p>
          </div>
        )}
      </div>
    </main>
  )
}
