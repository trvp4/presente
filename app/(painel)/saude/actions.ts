'use server'
import { revalidatePath } from 'next/cache'
import { getStaff } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { coletar } from '@/lib/saude-coletar'

export type SaudeState = { error?: string; resumo?: string }

// Botão "Conferir agora": a mesma conferência da tarefa de hora em hora. Grava com a chave secreta (a Equipe só lê).
export async function conferirAgora(): Promise<SaudeState> {
  const { isStaff } = await getStaff()
  if (!isStaff) return { error: 'Acesso não autorizado.' }
  const r = await coletar(createAdminClient(), 'manual')
  revalidatePath('/saude')
  const problemas = r.verificacoes.filter(v => v.status !== 'ok').length
  if (!r.gravado) return { error: 'A conferência rodou, mas não foi gravada. O banco está respondendo?' }
  return { resumo: problemas ? `Conferido: ${problemas} ${problemas === 1 ? 'verificação pede' : 'verificações pedem'} atenção` : 'Conferido: tudo certo' }
}

const ESTADOS = ['aberto', 'resolvido', 'ignorado'] as const

export async function mudarAchado(id: string, estado: (typeof ESTADOS)[number]): Promise<SaudeState> {
  const { supabase, isStaff, email } = await getStaff()
  if (!isStaff) return { error: 'Acesso não autorizado.' }
  if (!ESTADOS.includes(estado)) return { error: 'Estado inválido.' }
  const agora = new Date().toISOString()
  const fechado = estado !== 'aberto'
  const { error } = await supabase.from('achados')
    .update({ estado, atualizado_em: agora, resolvido_em: fechado ? agora : null, resolvido_por: fechado ? email : null })
    .eq('id', id)
  if (error) return { error: 'Não foi possível mudar o achado. Tente de novo.' }
  revalidatePath('/saude')
  return {}
}
