// Confere se o Supabase está configurado para o Presente.
// Uso: npm run check   (lê as chaves do .env.local; não mostra nenhuma chave na tela)
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './env.mjs'

const env = loadEnv()

let failed = false
const ok = msg => console.log(`  ✔ ${msg}`)
const bad = (msg, fix) => { failed = true; console.log(`  ✘ ${msg}${fix ? `\n      → ${fix}` : ''}`) }

console.log('\nPresente · verificação do Supabase\n')

// 1. chaves
const url = env.NEXT_PUBLIC_SUPABASE_URL, pub = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, secret = env.SUPABASE_SECRET_KEY
const placeholder = v => !v || v.includes('xxxx')
if (placeholder(url) || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) bad('NEXT_PUBLIC_SUPABASE_URL', 'cole a Project URL (ex.: https://abcd1234.supabase.co), sem barra no final')
else ok('URL do projeto')
if (placeholder(pub)) bad('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'cole a chave publishable (sb_publishable_…) ou a antiga "anon"')
else ok('Chave publishable preenchida')
if (placeholder(secret)) bad('SUPABASE_SECRET_KEY', 'cole a chave secret (sb_secret_…) ou a antiga "service_role"')
else ok('Chave secret preenchida')
if (failed) { console.log('\nPreencha o .env.local e rode de novo.\n'); process.exit(1) }

const admin = createClient(url, secret, { auth: { persistSession: false } })

// 2. tabelas
const tables = ['staff', 'projects', 'trainings', 'attendances']
let tablesOk = true
for (const t of tables) {
  const { error } = await admin.from(t).select('*', { count: 'exact', head: true })
  if (error) { tablesOk = false; bad(`Tabela ${t}: ${error.message}`) }
}
if (tablesOk) ok('Tabelas criadas (staff, projects, trainings, attendances)')
else console.log('      → rode supabase/migrations/0001_init.sql no SQL Editor')

// 3. cadastro público desligado
try {
  const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: pub } })
  const s = await r.json()
  if (s.disable_signup) ok('Cadastro público desligado')
  else bad('Cadastro público ainda está ligado', 'Authentication → Sign In / Providers → desligue "Allow new users to sign up"')
} catch (e) { bad(`Não consegui ler as configurações de login: ${e.message}`) }

// 4. usuários e equipe
const { data: users, error: uErr } = await admin.auth.admin.listUsers({ perPage: 200 })
if (uErr) bad(`Não consegui listar usuários: ${uErr.message}`, 'confira se a SUPABASE_SECRET_KEY é a chave secret')
else if (!users.users.length) bad('Nenhum usuário criado', 'Authentication → Users → Add user → Create new user')
else ok(`${users.users.length} usuário(s) criado(s)`)

if (tablesOk) {
  const { data: staff } = await admin.from('staff').select('email')
  const emails = new Set((staff ?? []).map(s => s.email))
  if (!emails.size) bad('Nenhum e-mail autorizado na tabela staff', "SQL Editor: insert into public.staff (email) values ('seu@email.com');")
  else ok(`${emails.size} e-mail(s) autorizado(s) no painel`)
  for (const u of users?.users ?? []) {
    if (u.email && !emails.has(u.email.toLowerCase())) console.log(`  ! ${u.email} existe no login mas não está na tabela staff (não verá nada no painel)`)
  }
}

console.log(failed ? '\nAinda falta algum passo acima.\n' : '\nTudo certo! Rode "npm run dev" e abra http://localhost:3000\n')
process.exit(failed ? 1 : 0)
