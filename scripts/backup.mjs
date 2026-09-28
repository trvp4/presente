// Cópia de segurança completa do banco (projetos, listas, presenças e equipe).
// Uso: npm run backup  →  cria backups/presente-AAAA-MM-DD.json
// ATENÇÃO: o arquivo contém CPFs e assinaturas. Guarde em local protegido e não compartilhe.
import { mkdirSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './env.mjs'

const env = loadEnv()
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })

async function all(table) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select('*').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

const out = { gerado_em: new Date().toISOString() }
for (const t of ['staff', 'projects', 'trainings', 'attendances']) out[t] = await all(t)

const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
const dir = new URL('../backups/', import.meta.url)
mkdirSync(dir, { recursive: true })
const file = new URL(`presente-${day}.json`, dir)
writeFileSync(file, JSON.stringify(out))
console.log(`\nBackup salvo em backups/presente-${day}.json`)
console.log(`  ${out.projects.length} projeto(s), ${out.trainings.length} lista(s), ${out.attendances.length} presença(s)`)
console.log('  Contém CPFs e assinaturas: guarde em local protegido.\n')
