import { getStaff } from '@/lib/supabase/server'
import { siteOrigin } from '@/lib/origin'
import { todayISO, type Project, type Training } from '@/lib/format'
import Home, { type Recent, type Row } from './Home'

export const metadata = { title: 'Listas de presença' }

export default async function Page() {
  const { supabase } = await getStaff()
  const { data } = await supabase
    .from('trainings')
    .select('*, project:projects(*), attendances(count)')
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })

  const rows: Row[] = (data ?? []).map((t: Training & { project: Project; attendances: { count: number }[] }) => ({
    ...t,
    count: t.attendances?.[0]?.count ?? 0,
  }))

  // últimas assinaturas das listas que podem estar recebendo presenças hoje
  const today = todayISO()
  const ids = rows.filter(r => r.state === 'open' || (r.state === 'auto' && r.date === today)).map(r => r.id)
  let recent: Recent[] = []
  if (ids.length) {
    const { data: att } = await supabase
      .from('attendances')
      .select('id, training_id, full_name, role, created_at, signature')
      .in('training_id', ids.slice(0, 20))
      .order('created_at', { ascending: false })
      .limit(60)
    recent = att ?? []
  }

  return <Home rows={rows} recent={recent} origin={await siteOrigin()} />
}
