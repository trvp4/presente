import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente com a sessão do gestor logado (respeita o RLS).
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Em Server Components não dá para gravar cookies; o proxy.ts renova a sessão.
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    },
  )
}

// Retorna o e-mail do gestor se ele estiver logado e cadastrado na equipe.
export async function getStaff() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const email = data?.claims?.email as string | undefined
  if (!email) return { supabase, email: null, name: null, isStaff: false }
  const { data: isStaff } = await supabase.rpc('is_staff')
  let name: string | null = null
  if (isStaff === true) {
    const { data } = await supabase.from('staff').select('name').eq('email', email.toLowerCase()).maybeSingle()
    name = data?.name ?? null
  }
  return { supabase, email, name, isStaff: isStaff === true }
}
