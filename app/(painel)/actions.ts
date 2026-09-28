'use server'
import { randomInt } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getStaff } from '@/lib/supabase/server'
import { abertaAte, encerrar, peloHorario, prazoNaCorrecao, reabrir, validarCapacitacao } from '@/lib/capacitacao'
import { validarProjeto } from '@/lib/projeto'
import { escolaDaLista } from '@/lib/espacos/banco'
import type { DadosCapacitacao } from '@/lib/capacitacao'

async function staffOrThrow() {
  const s = await getStaff()
  if (!s.isStaff) throw new Error('Acesso não autorizado.')
  return s.supabase
}

// ---------------- projetos ----------------
export type ProjectState = { error?: string; ok?: boolean }

const LOGO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/

const revalidarProjetos = () => {
  revalidatePath('/projetos')
  revalidatePath('/listas/nova')
  revalidatePath('/', 'layout')
}

export async function createProject(_prev: ProjectState, form: FormData): Promise<ProjectState> {
  const supabase = await staffOrThrow()
  const v = validarProjeto({ name: form.get('name'), pronac: form.get('pronac') })
  if (!v.ok) return { error: v.error }
  const logo = String(form.get('logo') || '') || null
  if (logo && (!LOGO_RE.test(logo) || logo.length > 600_000)) return { error: 'Não foi possível usar essa imagem. Tente um PNG ou JPG menor.' }

  const { error } = await supabase.from('projects').insert({ ...v.projeto, logo })
  if (error) return { error: 'Não foi possível salvar o projeto. Tente de novo.' }
  revalidarProjetos()
  return { ok: true }
}

// Corrige nome e Pronac. As listas já criadas passam a mostrar os dados corrigidos.
export async function updateProject(id: string, dados: { name: string; pronac: string }): Promise<ProjectState> {
  const supabase = await staffOrThrow()
  const v = validarProjeto(dados)
  if (!v.ok) return { error: v.error }
  const { error } = await supabase.from('projects').update(v.projeto).eq('id', id)
  if (error) return { error: 'Não foi possível salvar a correção. Tente de novo.' }
  revalidarProjetos()
  return { ok: true }
}

// Só exclui Projeto sem listas: as listas (e as assinaturas nelas) dependem dele.
export async function deleteProject(id: string): Promise<ProjectState> {
  const supabase = await staffOrThrow()
  const { count } = await supabase.from('trainings').select('id', { count: 'exact', head: true }).eq('project_id', id)
  if (count) return { error: `Este projeto tem ${count} ${count === 1 ? 'lista' : 'listas'}. Exclua as listas antes ou arquive o projeto.` }
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) return { error: 'Não foi possível excluir o projeto. Tente de novo.' }
  revalidarProjetos()
  return { ok: true }
}

// Arquivado: some da criação de listas, mas o histórico continua.
export async function setProjectArchived(id: string, archived: boolean) {
  const supabase = await staffOrThrow()
  await supabase.from('projects').update({ archived }).eq('id', id)
  revalidarProjetos()
}

export async function setProjectLogo(id: string, logo: string | null) {
  const supabase = await staffOrThrow()
  if (logo && (!LOGO_RE.test(logo) || logo.length > 600_000)) throw new Error('Imagem inválida.')
  await supabase.from('projects').update({ logo }).eq('id', id)
  revalidatePath('/projetos')
}

// ---------------- capacitações ----------------
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const newCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

// Liga a lista ao cadastro único de escolas (ADR 0007). Uma falha aqui nunca impede a lista: fica sem ligação.
async function escolaDaCapacitacao(supabase: Awaited<ReturnType<typeof staffOrThrow>>, c: DadosCapacitacao) {
  try {
    const { data } = await supabase.from('schools').select('id, nome, apelidos, cnpj')
    const e = escolaDaLista(data ?? [], c.beneficiary_name, c.beneficiary_cnpj || null)
    if (e.acao === 'usar') return e.id
    if (e.acao === 'completar') {
      const { error } = await supabase.from('schools').update({ cnpj: c.beneficiary_cnpj }).eq('id', e.id)
      return error ? null : e.id
    }
    if (e.acao === 'criar') {
      const { data: nova, error } = await supabase.from('schools').insert({ nome: c.beneficiary_name, cnpj: c.beneficiary_cnpj, cidade: c.city || null }).select('id').single()
      if (!error) return nova.id as string
      const { data: outra } = await supabase.from('schools').select('id').eq('cnpj', c.beneficiary_cnpj).maybeSingle() // criada ao mesmo tempo por outra aba
      return (outra?.id as string) ?? null
    }
  } catch {}
  return null
}

// Lista de presença sai com o Pronac no cabeçalho: projeto sem Pronac (só do Espaços de Leitura) não tem lista.
async function projetoSemPronac(supabase: Awaited<ReturnType<typeof staffOrThrow>>, projectId: string) {
  const { data } = await supabase.from('projects').select('pronac').eq('id', projectId).maybeSingle()
  return !data?.pronac
}

export type TrainingState = { error?: string; field?: string; id?: string; code?: string }

export async function createTraining(_prev: TrainingState, form: FormData): Promise<TrainingState> {
  const supabase = await staffOrThrow()
  const v = validarCapacitacao(Object.fromEntries(form))
  if (!v.ok) return { error: v.error, field: v.field }

  if (await projetoSemPronac(supabase, v.capacitacao.project_id)) return { error: 'Cadastre o Pronac do projeto (em Projetos) antes de criar a lista.', field: 'project_id' }
  const school_id = await escolaDaCapacitacao(supabase, v.capacitacao)
  // o código do link é único; em caso raro de colisão, tenta outro
  for (let i = 0; i < 5; i++) {
    const code = newCode()
    const { data, error } = await supabase
      .from('trainings')
      .insert({ ...v.capacitacao, code, school_id, open_until: abertaAte(v.capacitacao) })
      .select('id, code')
      .single()
    if (!error && data) {
      // lista criada a partir do plano de capacitações: fica ligada ao item (se ele ainda não tiver lista)
      const plano = String(form.get('plano_id') || '')
      if (plano) await supabase.from('plano_capacitacoes').update({ training_id: data.id }).eq('id', plano).is('training_id', null)
      revalidatePath('/', 'layout')
      return { id: data.id, code: data.code }
    }
    if (error?.code !== '23505') return { error: 'Não foi possível criar a lista. Tente de novo.' }
  }
  return { error: 'Não foi possível gerar o link. Tente de novo.' }
}

// Corrige os dados da lista. O código (link e QR code já enviados) e as assinaturas não mudam.
export async function updateTraining(id: string, dados: Record<string, unknown>): Promise<TrainingState> {
  const supabase = await staffOrThrow()
  const v = validarCapacitacao(dados)
  if (!v.ok) return { error: v.error, field: v.field }
  if (await projetoSemPronac(supabase, v.capacitacao.project_id)) return { error: 'Cadastre o Pronac do projeto (em Projetos) antes de usá-lo numa lista.', field: 'project_id' }
  const { error } = await supabase.from('trainings').update({ ...v.capacitacao, school_id: await escolaDaCapacitacao(supabase, v.capacitacao), ...prazoNaCorrecao(v.capacitacao) }).eq('id', id)
  if (error) return { error: 'Não foi possível salvar a correção. Tente de novo.' }
  revalidatePath('/', 'layout')
  revalidatePath(`/listas/${id}`)
  return { id }
}

// Chave "Aceitando presenças": reabrir (por 48 h, depois fecha sozinha), encerrar ou voltar a seguir o horário
export async function setTrainingState(id: string, acao: 'reabrir' | 'encerrar' | 'horario') {
  const supabase = await staffOrThrow()
  const mudanca = { reabrir, encerrar, horario: peloHorario }[acao]
  if (!mudanca) throw new Error('Ação inválida.')
  await supabase.from('trainings').update(mudanca()).eq('id', id)
  revalidatePath('/', 'layout')
  revalidatePath(`/listas/${id}`)
}

export async function setPdfSent(id: string, sent: boolean) {
  const supabase = await staffOrThrow()
  await supabase.from('trainings').update({ pdf_sent_at: sent ? new Date().toISOString() : null }).eq('id', id)
  revalidatePath('/', 'layout')
  revalidatePath(`/listas/${id}`)
}

export async function deleteTraining(id: string) {
  const supabase = await staffOrThrow()
  const { error } = await supabase.from('trainings').delete().eq('id', id)
  if (error) throw new Error('Não foi possível excluir a lista.')
  revalidatePath('/', 'layout')
  redirect('/listas')
}

export async function removeAttendance(id: string, trainingId: string) {
  const supabase = await staffOrThrow()
  await supabase.from('attendances').delete().eq('id', id)
  revalidatePath(`/listas/${trainingId}`)
  revalidatePath('/', 'layout')
}
