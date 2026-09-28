// Worker publicado na Cloudflare: o site (gerado pelo OpenNext) + uma tarefa diária.
// @ts-expect-error — arquivo gerado por `opennextjs-cloudflare build`
import { default as handler } from './.open-next/worker.js'

type Env = {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SECRET_KEY: string
}

export default {
  fetch: handler.fetch,

  // Mantém o Supabase gratuito ativo: ele pausa projetos sem uso por 7 dias.
  async scheduled(_event: unknown, env: Env) {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/projects?select=id&limit=1`, {
      headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` },
    })
    console.log(`keep-alive do Supabase: HTTP ${res.status}`)
  },
}
