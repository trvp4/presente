// Libera um e-mail na equipe do painel (tabela staff). Usado pelo assistente.
// Uso: EMAIL=maria@presente.app NOME="Maria" node scripts/add-staff.mjs
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './env.mjs'

const env = loadEnv()
const email = String(process.env.EMAIL || '').trim().toLowerCase()
const name = String(process.env.NOME || '').trim()
if (!email || !name) {
  console.error('Informe EMAIL e NOME.')
  process.exit(1)
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const { error } = await admin.from('staff').upsert({ email, name }, { onConflict: 'email' })
if (error) {
  console.error(error.message)
  process.exit(1)
}
