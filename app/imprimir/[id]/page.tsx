import { notFound } from 'next/navigation'
import { Carlito } from 'next/font/google'
import { getStaff } from '@/lib/supabase/server'
import { REALIZACAO, brDate, fmtCnpj, fmtCpf, hm, todayISO, type Attendance, type Project, type Training } from '@/lib/format'
import PrintButton from './PrintButton'
import './print.css'

// Carlito tem as mesmas medidas da Calibri, a fonte do modelo em Word
const calibri = Carlito({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-calibri' })

export const metadata = { title: 'Lista para imprimir' }

// Lista no modelo oficial da empresa (Word "Lista de presença – Capacitação"), pronta para "Salvar como PDF".
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, isStaff } = await getStaff()
  if (!isStaff) notFound()
  const { data: t } = await supabase.from('trainings').select('*, project:projects(*)').eq('id', id).maybeSingle()
  if (!t) notFound()
  const { data } = await supabase.from('attendances').select('*').eq('training_id', id).order('created_at')
  const training = t as Training & { project: Project }
  const p = training.project
  const list = (data ?? []) as Attendance[]

  return (
    <div className={`print-wrap ${calibri.variable}`}>
      <div className="print-bar no-print">
        <span>Na janela de impressão, escolha <b>Salvar como PDF</b>.</span>
        <PrintButton />
      </div>
      <article className="sheet-a4">
        {p.logo && <img className="sheet-logo" src={p.logo} alt={`Logo ${p.name}`} />}
        <h1>Lista de presença – Capacitação</h1>
        <p><b>Projeto: {p.name} · Pronac {p.pronac}</b></p>
        <p><b>Realização: {REALIZACAO}</b></p>
        <p>
          <b>Instituição Beneficiada: </b>{training.beneficiary_name ?? ''}
          {training.beneficiary_cnpj && <> · CNPJ {fmtCnpj(training.beneficiary_cnpj)}</>}
        </p>
        <p><b>Cidade: </b>{training.city ?? ''}</p>
        <p><b>Data: </b>{brDate(training.date)}</p>
        <p><b>Horário: </b>{hm(training.start_time)} às {hm(training.end_time)}</p>
        <p className="theme"><b>Tema: </b>{training.title}{training.instructor ? ` · Instrutor(a): ${training.instructor}` : ''}</p>

        <table>
          <colgroup><col className="c-name" /><col className="c-cpf" /><col className="c-sig" /></colgroup>
          <thead>
            <tr><th>NOME/CARGO</th><th>CPF</th><th>ASSINATURA</th></tr>
          </thead>
          <tbody>
            {list.map((a, i) => (
              <tr key={a.id}>
                <td><span className="n">{i + 1}.</span>{a.full_name} / {a.role}</td>
                <td className="nowrap">{fmtCpf(a.cpf)}</td>
                <td className="sig"><img src={a.signature} alt="" /></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={3} style={{ textAlign: 'center' }}>Nenhuma presença registrada.</td></tr>}
          </tbody>
        </table>

        <p className="note">
          Total: {list.length} {list.length === 1 ? 'participante' : 'participantes'}. Assinaturas coletadas digitalmente pelo sistema Presente,
          com consentimento de cada participante para uso na prestação de contas do projeto. Documento gerado em {brDate(todayISO())}.
        </p>
      </article>
    </div>
  )
}
