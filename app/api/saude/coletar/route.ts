import { formsAutorizado } from '@/lib/protect'
import { createAdminClient } from '@/lib/supabase/admin'
import { coletar } from '@/lib/saude-coletar'

// Conferência de hora em hora da Saúde do sistema, chamada pela tarefa agendada (custom-worker.ts)
// com o segredo interno FORMS_SECRET. Não devolve dados pessoais, só o resumo das verificações.
export async function POST(req: Request) {
  if (!formsAutorizado(req)) return Response.json({ erro: 'não autorizado' }, { status: 401 })
  const r = await coletar(createAdminClient(), 'agendada')
  return Response.json({
    gravado: r.gravado, abertos: r.abertos ?? 0, resolvidos: r.resolvidos ?? 0,
    problemas: r.verificacoes.filter(v => v.status !== 'ok').map(v => `${v.chave}: ${v.valor}`),
  })
}
