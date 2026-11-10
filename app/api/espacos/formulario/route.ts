import { formsAutorizado } from '@/lib/protect'
import { createAdminClient } from '@/lib/supabase/admin'
import { lerEnvio } from '@/lib/espacos/formulario'
import { gravarResposta } from '@/lib/espacos/gravar'

// Recebe cada resposta do Google Forms do Espaços de Leitura (enviada pelo script do formulário).
// Protegido pelo segredo FORMS_SECRET; a gravação (idempotente) fica em lib/espacos/gravar.ts.
export async function POST(req: Request) {
  if (!formsAutorizado(req)) return Response.json({ erro: 'não autorizado' }, { status: 401 })
  if (Number(req.headers.get('content-length') ?? 0) > 1_000_000) return Response.json({ erro: 'envio grande demais' }, { status: 413 })

  const envio = lerEnvio(await req.json().catch(() => null))
  if (!envio.ok) return Response.json({ erro: envio.erro }, { status: 400 })

  const r = await gravarResposta(createAdminClient(), { titulos: envio.titulos, valores: envio.valores as string[], referencia: envio.referencia })
  if (r.acao === 'recusada') return Response.json(r, { status: 422 })
  if (r.acao === 'erro') return Response.json({ erro: r.erro }, { status: 500 })
  return Response.json(r, { status: r.acao === 'nova' ? 201 : 200 })
}
