import { formsAutorizado } from '@/lib/protect'
import { createAdminClient } from '@/lib/supabase/admin'
import { lerEnvio, linhaDaResposta } from '@/lib/espacos/formulario'
import { PERGUNTAS_ESSENCIAIS, mapearPerguntas, respostaDoFormulario } from '@/lib/espacos/regras'

// Recebe cada resposta do Google Forms do Espaços de Leitura (enviada pelo script do formulário).
// Protegido pelo segredo FORMS_SECRET; idempotente: o mesmo envio não duplica, e uma edição da
// escola atualiza só o conteúdo original (a revisão da Equipe fica). Os derivados são calculados na leitura.
export async function POST(req: Request) {
  if (!formsAutorizado(req)) return Response.json({ erro: 'não autorizado' }, { status: 401 })
  if (Number(req.headers.get('content-length') ?? 0) > 1_000_000) return Response.json({ erro: 'envio grande demais' }, { status: 413 })

  const envio = lerEnvio(await req.json().catch(() => null))
  if (!envio.ok) return Response.json({ erro: envio.erro }, { status: 400 })

  const { mapa, faltando } = mapearPerguntas(envio.titulos)
  const essenciais = PERGUNTAS_ESSENCIAIS.filter(c => faltando.includes(c))
  if (essenciais.length) return Response.json({ acao: 'recusada', motivo: `perguntas do formulário não encontradas: ${essenciais.join(', ')} (o formulário mudou?)` }, { status: 422 })

  const linha = linhaDaResposta(respostaDoFormulario(envio.valores, mapa, envio.referencia))
  const admin = createAdminClient()
  const { data: atual } = await admin.from('el_respostas').select('hash_origem').eq('id', linha.id).maybeSingle()
  if (atual?.hash_origem === linha.hash_origem) return Response.json({ acao: 'igual', id: linha.id })
  if (atual) {
    const { error } = await admin.from('el_respostas').update(linha).eq('id', linha.id)
    if (error) return Response.json({ erro: 'não foi possível atualizar a resposta' }, { status: 500 })
    return Response.json({ acao: 'editada', id: linha.id })
  }
  const { error } = await admin.from('el_respostas').insert(linha)
  if (error?.code === '23505') return Response.json({ acao: 'igual', id: linha.id }) // mesmo envio chegando duas vezes ao mesmo tempo
  if (error) return Response.json({ erro: 'não foi possível gravar a resposta' }, { status: 500 })
  return Response.json({ acao: 'nova', id: linha.id }, { status: 201 })
}
