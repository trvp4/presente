import { notFound } from 'next/navigation'
import { getStaff } from '@/lib/supabase/server'
import { siteOrigin } from '@/lib/origin'
import { maskCpf, type Attendance, type Project, type Training } from '@/lib/format'
import Detail from './Detail'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await getStaff()
  const { data: t } = await supabase.from('trainings').select('*, project:projects(*)').eq('id', id).maybeSingle()
  if (!t) notFound()
  const { data: projects } = await supabase.from('projects').select('id, name, pronac, logo, archived').not('pronac', 'is', null).order('name')
  const { data: att } = await supabase
    .from('attendances')
    .select('*')
    .eq('training_id', id)
    .order('created_at', { ascending: false })

  // o painel só recebe o CPF mascarado; o número completo sai apenas na lista em Word e na planilha
  const initial = ((att ?? []) as Attendance[]).map(a => ({ ...a, cpf: maskCpf(a.cpf) }))

  return (
    <Detail
      training={t as Training & { project: Project }}
      initial={initial}
      origin={await siteOrigin()}
      projects={(projects ?? []) as Project[]}
    />
  )
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await getStaff()
  const { data } = await supabase.from('trainings').select('title').eq('id', id).maybeSingle()
  return { title: data?.title ?? 'Lista' }
}
