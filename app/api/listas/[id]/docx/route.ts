import { getStaff } from '@/lib/supabase/server'
import { buildListaDocx } from '@/lib/docx-lista'
import type { Attendance, Project, Training } from '@/lib/format'

// Lista de presença em Word (.docx), no modelo da empresa.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, isStaff } = await getStaff()
  if (!isStaff) return new Response('Não autorizado', { status: 401 })

  const { data: t } = await supabase.from('trainings').select('*, project:projects(*)').eq('id', id).maybeSingle()
  if (!t) return new Response('Lista não encontrada', { status: 404 })
  const { data } = await supabase.from('attendances').select('*').eq('training_id', id).order('created_at')

  const tr = t as Training & { project: Project }
  const file = await buildListaDocx(tr, tr.project, (data ?? []) as Attendance[])
  const slug = `${tr.project.name} ${tr.beneficiary_name ?? ''}`
    .normalize('NFD').replace(/\p{M}/gu, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const name = `Lista de presenca - ${slug} - ${tr.date}.docx`

  return new Response(file, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  })
}
