// Lê o .env.local e devolve um cliente Supabase com a chave secreta (uso só em scripts locais).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

export function loadEnv() {
  return Object.fromEntries(
    readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
      .split(/\r?\n/)
      .filter(l => l.trim() && !l.trim().startsWith('#') && l.includes('='))
      .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  )
}

export function adminClient(env = loadEnv()) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
}
