'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { clientIp, withinRateLimit } from '@/lib/protect'

export type LoginState = { error?: string }

export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  // aceita só o nome de usuário (ex.: maria) ou o e-mail completo
  const login = String(form.get('email') || '').trim().toLowerCase()
  const email = login.includes('@') ? login : `${login}@presente.app`
  const password = String(form.get('password') || '')
  if (!login || !password) return { error: 'Informe usuário e senha.' }
  // O Supabase vê o IP da Cloudflare, não o de quem tenta: o limite por pessoa fica aqui.
  if (!(await withinRateLimit(`login:${await clientIp()}`, 'LOGIN_LIMITER')))
    return { error: 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Usuário ou senha incorretos.' }
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
