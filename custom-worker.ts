// Worker publicado na Cloudflare: o site (gerado pelo OpenNext) + uma tarefa de hora em hora.
// @ts-expect-error — arquivo gerado por `opennextjs-cloudflare build`
import { default as handler } from './.open-next/worker.js'

type Env = {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SECRET_KEY: string
  FORMS_SECRET: string
}

export default {
  fetch: handler.fetch,

  async scheduled(_event: unknown, env: Env, ctx: unknown) {
    // Mantém o Supabase gratuito ativo: ele pausa projetos sem uso.
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/projects?select=id&limit=1`, {
      headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` },
    })
    console.log(`keep-alive do Supabase: HTTP ${res.status}`)

    // Lê a planilha de respostas do Espaços de Leitura (app/api/espacos/planilha), pelo próprio site.
    const planilha = await handler.fetch(new Request('https://presente.presente.workers.dev/api/espacos/planilha', {
      method: 'POST', headers: { Authorization: `Bearer ${env.FORMS_SECRET}` },
    }), env, ctx)
    console.log(`planilha do Espaços de Leitura: HTTP ${planilha.status} ${await planilha.text()}`)
  },
}
