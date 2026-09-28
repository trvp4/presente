import { createAdminClient } from '@/lib/supabase/admin'

// Verificação de saúde: confirma que o site publicado alcança o banco com a chave secreta atual.
// Público de propósito (usado pelo assistente depois de publicar ou trocar a chave); não devolve dados.
export async function GET() {
  const { error } = await createAdminClient().from('projects').select('id', { count: 'exact', head: true })
  return Response.json({ ok: !error }, { status: error ? 503 : 200, headers: { 'Cache-Control': 'no-store' } })
}
