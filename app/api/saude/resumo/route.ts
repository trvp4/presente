import { createAdminClient } from '@/lib/supabase/admin'

// Resumo público da Saúde do sistema, lido pelo agente diário (rotina na nuvem, sem segredo).
// Só a situação de cada verificação, sem o valor nem o detalhe: nada de nomes de listas, escolas ou pessoas.
export async function GET() {
  const { data, error } = await createAdminClient()
    .from('saude_rodadas').select('quando, resultado').order('quando', { ascending: false }).limit(1).maybeSingle()
  if (error) return Response.json({ erro: 'indisponível' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  const verificacoes = ((data?.resultado ?? []) as { chave: string; nome: string; status: string }[])
    .map(({ chave, nome, status }) => ({ chave, nome, status }))
  return Response.json({ atualizado: data?.quando ?? null, verificacoes }, { headers: { 'Cache-Control': 'no-store' } })
}
