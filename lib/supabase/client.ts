import { createBrowserClient } from '@supabase/ssr'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}

// Acompanha as Presenças de uma Capacitação em tempo real. Devolve a função que para de ouvir.
// O login da Equipe é entregue ao tempo real ANTES de assinar o canal: sem ele o Supabase trata a
// conexão como anônima, o RLS recusa a assinatura e nenhuma Presença chega ao painel.
export function ouvirPresencas(
  trainingId: string,
  h: { inserida?: (row: Record<string, unknown>) => void; removida?: (id: string) => void },
) {
  const supabase = createClient()
  let canal: RealtimeChannel | null = null
  let ativo = true
  ;(async () => {
    const { data } = await supabase.auth.getSession()
    if (!ativo || !data.session) return
    await supabase.realtime.setAuth(data.session.access_token)
    if (!ativo) return
    canal = supabase.channel(`presencas-${trainingId}`)
    if (h.inserida) {
      const cb = h.inserida
      canal.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendances', filter: `training_id=eq.${trainingId}` }, p => cb(p.new))
    }
    if (h.removida) {
      const cb = h.removida
      canal.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'attendances' }, p => {
        const id = (p.old as { id?: string }).id
        if (id) cb(id)
      })
    }
    canal.subscribe()
  })()
  return () => {
    ativo = false
    if (canal) supabase.removeChannel(canal)
  }
}
