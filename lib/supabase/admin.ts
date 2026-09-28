import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Cliente com a chave secreta. Usado apenas no servidor, para a página pública
// do voluntário (ler os dados da lista e gravar a presença depois de validar).
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
