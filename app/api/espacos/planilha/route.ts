import { formsAutorizado } from '@/lib/protect'
import { createAdminClient } from '@/lib/supabase/admin'
import { lerRespostas } from '@/lib/google/planilhas'
import { enviosDaPlanilha, idDaPlanilha } from '@/lib/espacos/planilha'
import { gravarResposta } from '@/lib/espacos/gravar'

// Lê a planilha de respostas do formulário do Espaços de Leitura e grava o que for novo ou editado.
// Chamado de hora em hora pela tarefa agendada do worker (custom-worker.ts), com o segredo FORMS_SECRET.
// A planilha é a da variável PLANILHA_ESPACOS (wrangler.jsonc), compartilhada com a conta de serviço.
export async function POST(req: Request) {
  if (!formsAutorizado(req)) return Response.json({ erro: 'não autorizado' }, { status: 401 })
  const planilha = idDaPlanilha(process.env.PLANILHA_ESPACOS ?? '')
  if (!planilha) return Response.json({ acao: 'sem planilha configurada' })

  let lidas
  try {
    lidas = await lerRespostas(planilha)
  } catch (e) {
    console.error(`planilha do Espaços de Leitura: ${(e as Error).message}`)
    return Response.json({ erro: (e as Error).message }, { status: 502 })
  }

  const admin = createAdminClient()
  const { data: atuais, error } = await admin.from('el_respostas').select('id, hash_origem')
  if (error) return Response.json({ erro: 'não foi possível ler as respostas já gravadas' }, { status: 500 })
  const hashes = new Map((atuais ?? []).map(r => [String(r.id), String(r.hash_origem)]))

  const conta: Record<string, number> = { nova: 0, editada: 0, igual: 0, recusada: 0, erro: 0 }
  const problemas: string[] = []
  for (const envio of enviosDaPlanilha(lidas.linhas, lidas.fuso)) {
    const r = await gravarResposta(admin, envio, hashes)
    conta[r.acao]++
    if (r.acao === 'recusada') problemas.push(`${envio.referencia}: ${r.motivo}`)
    if (r.acao === 'erro') problemas.push(`${envio.referencia}: ${r.erro}`)
  }
  const resumo = { novas: conta.nova, editadas: conta.editada, iguais: conta.igual, recusadas: conta.recusada, erros: conta.erro, problemas: problemas.slice(0, 20) }
  console.log(`planilha do Espaços de Leitura: ${JSON.stringify(resumo)}`)
  return Response.json(resumo, { status: conta.erro ? 500 : 200 })
}
