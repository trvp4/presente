import { getStaff } from '@/lib/supabase/server'
import { planilhaCsv } from '@/lib/planilha'
import { REALIZACAO, brDate, fmtCnpj, hm, fmtCpf, timeSP, type Attendance, type Project, type Training } from '@/lib/format'

// Planilha (CSV com ; e BOM, abre direto no Excel em português).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, isStaff } = await getStaff()
  if (!isStaff) return new Response('Não autorizado', { status: 401 })

  const { data: t } = await supabase.from('trainings').select('*, project:projects(*)').eq('id', id).maybeSingle()
  if (!t) return new Response('Lista não encontrada', { status: 404 })
  const { data } = await supabase.from('attendances').select('full_name, role, cpf, created_at').eq('training_id', id).order('created_at')

  const tr = t as Training & { project: Project }
  const lines = [
    ['Projeto', 'Pronac', 'Realização', 'Instituição beneficiada', 'CNPJ da instituição', 'Cidade', 'Capacitação', 'Data', 'Horário', 'Nº', 'Nome', 'Cargo', 'CPF', 'Hora da assinatura'],
    ...((data ?? []) as Pick<Attendance, 'full_name' | 'role' | 'cpf' | 'created_at'>[]).map((a, i) => [
      tr.project.name, tr.project.pronac ?? '', REALIZACAO, tr.beneficiary_name ?? '', tr.beneficiary_cnpj ? fmtCnpj(tr.beneficiary_cnpj) : '', tr.city ?? '', tr.title, brDate(tr.date), `${hm(tr.start_time)} às ${hm(tr.end_time)}`,
      i + 1, a.full_name, a.role, fmtCpf(a.cpf), timeSP(a.created_at),
    ]),
  ]
  const csv = planilhaCsv(lines)
  const name = `presenca-${tr.date}-${tr.code}.csv`
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  })
}
