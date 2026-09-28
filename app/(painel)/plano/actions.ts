'use server'
import { revalidatePath } from 'next/cache'
import { getStaff } from '@/lib/supabase/server'

// Plano de capacitações: a Equipe acrescenta, corrige e liga itens às Listas de Presença. RLS: is_staff().
export type Resultado = { error?: string }
export type DadosItem = {
  project_id: string; school_id: string; patrocinador: string; tipo: string; cidade: string
  data_prevista: string; hora: string; situacao: string; observacoes: string
}

async function equipe() {
  const s = await getStaff()
  if (!s.isStaff) throw new Error('Acesso não autorizado.')
  return s.supabase
}
const txt = (v: unknown, max = 300) => String(v ?? '').trim().slice(0, max) || null

export async function salvarItem(id: string | null, d: DadosItem): Promise<Resultado> {
  const supabase = await equipe()
  if (!d.project_id) return { error: 'Escolha o projeto.' }
  if (!txt(d.tipo)) return { error: 'Informe o tipo da capacitação.' }
  if (d.data_prevista && !/^\d{4}-\d{2}-\d{2}$/.test(d.data_prevista)) return { error: 'Data inválida.' }
  if (d.hora && !/^\d{2}:\d{2}$/.test(d.hora)) return { error: 'Hora inválida.' }
  if (!['planejada', 'realizada', 'cancelada'].includes(d.situacao)) return { error: 'Situação inválida.' }
  const linha = {
    project_id: d.project_id, school_id: d.school_id || null, patrocinador: txt(d.patrocinador, 120), tipo: txt(d.tipo, 200)!,
    cidade: txt(d.cidade, 120), data_prevista: d.data_prevista || null, hora: d.hora || null, situacao: d.situacao, observacoes: txt(d.observacoes, 500),
  }
  const { error } = id
    ? await supabase.from('plano_capacitacoes').update(linha).eq('id', id)
    : await supabase.from('plano_capacitacoes').insert(linha)
  if (error) return { error: 'Não foi possível salvar.' }
  revalidatePath('/', 'layout')
  return {}
}

/** Liga o item a uma Lista de Presença que já existe (ou desliga, com null). Uma lista serve a um item só. */
export async function ligarLista(id: string, trainingId: string | null): Promise<Resultado> {
  const supabase = await equipe()
  const { error } = await supabase.from('plano_capacitacoes').update({ training_id: trainingId }).eq('id', id)
  if (error?.code === '23505') return { error: 'Essa lista já está ligada a outro item do plano.' }
  if (error) return { error: 'Não foi possível ligar a lista.' }
  revalidatePath('/', 'layout')
  return {}
}

export async function excluirItem(id: string): Promise<Resultado> {
  const supabase = await equipe()
  const { error } = await supabase.from('plano_capacitacoes').delete().eq('id', id)
  if (error) return { error: 'Não foi possível excluir.' }
  revalidatePath('/', 'layout')
  return {}
}
