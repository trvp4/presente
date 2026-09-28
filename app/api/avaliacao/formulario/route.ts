import { formsAutorizado } from '@/lib/protect'
import { createAdminClient } from '@/lib/supabase/admin'
import { lerEnvio } from '@/lib/espacos/formulario'
import { linhaDaAvaliacao } from '@/lib/avaliacao'

// Recebe cada resposta do Google Forms da avaliação da formação (script AvaliacaoParaCentral.gs).
// Mesmo segredo e mesmo formato do Espaços de Leitura; o mesmo envio não duplica, uma edição substitui.
export async function POST(req: Request) {
  if (!formsAutorizado(req)) return Response.json({ erro: 'não autorizado' }, { status: 401 })
  if (Number(req.headers.get('content-length') ?? 0) > 1_000_000) return Response.json({ erro: 'envio grande demais' }, { status: 413 })

  const envio = lerEnvio(await req.json().catch(() => null))
  if (!envio.ok) return Response.json({ erro: envio.erro }, { status: 400 })
  const linha = linhaDaAvaliacao(envio.titulos, envio.valores as string[], envio.referencia)
  if (!linha) return Response.json({ acao: 'recusada', motivo: 'pergunta do projeto não encontrada (o formulário mudou?)' }, { status: 422 })

  const admin = createAdminClient()
  const { data: atual } = await admin.from('av_respostas').select('hash_origem').eq('id', linha.id).maybeSingle()
  if (atual?.hash_origem === linha.hash_origem) return Response.json({ acao: 'igual', id: linha.id })
  const { error } = await admin.from('av_respostas').upsert(linha)
  if (error) return Response.json({ erro: 'não foi possível gravar a resposta' }, { status: 500 })
  return Response.json({ acao: atual ? 'editada' : 'nova', id: linha.id }, { status: atual ? 200 : 201 })
}
