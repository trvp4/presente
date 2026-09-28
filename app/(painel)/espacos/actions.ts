'use server'
import { revalidatePath } from 'next/cache'
import { getStaff } from '@/lib/supabase/server'
import { chaveEscola, ehMesIso, listaPipe } from '@/lib/espacos/normalizacao'
import { onlyDigits, todayISO } from '@/lib/format'

// Ações da Equipe no Espaços de Leitura. Gravam só o que a Equipe decide; situação, totais e
// pendências são recalculados na próxima leitura (ADR 0007). O RLS (is_staff) vale para todas.
export type Resultado = { error?: string }

async function equipe() {
  const s = await getStaff()
  if (!s.isStaff) throw new Error('Acesso não autorizado.')
  return s
}
const pronto = (): Resultado => {
  revalidatePath('/', 'layout')
  return {}
}
const texto = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/

// ---------------- ciclos ----------------
export async function abrirCiclo(mes: string, prazo: string): Promise<Resultado> {
  const { supabase } = await equipe()
  if (!ehMesIso(mes)) return { error: 'Escolha o mês.' }
  if (prazo && !DATA_RE.test(prazo)) return { error: 'Prazo inválido.' }
  const { error } = await supabase.from('el_ciclos').insert({ id: mes, prazo: prazo || null })
  if (error?.code === '23505') return { error: 'Esse mês já foi aberto.' }
  if (error) return { error: 'Não foi possível abrir o mês.' }
  return pronto()
}

export async function encerrarCiclo(id: string, encerrar: boolean): Promise<Resultado> {
  const { supabase } = await equipe()
  const { error } = await supabase.from('el_ciclos').update({ situacao: encerrar ? 'encerrado' : 'aberto' }).eq('id', id)
  if (error) return { error: 'Não foi possível mudar a situação do mês.' }
  return pronto()
}

// ---------------- cobrança ----------------
const CANAIS = ['WhatsApp', 'Telefone', 'E-mail', 'Visita', 'Outro']

export async function registrarContato(ciclo: string, vinculo: string, canal: string, resultado: string): Promise<Resultado> {
  const { supabase, name, email } = await equipe()
  if (!CANAIS.includes(canal)) return { error: 'Escolha o canal.' }
  const { error } = await supabase.from('el_contatos').insert({ ciclo_id: ciclo, vinculo_id: vinculo, canal, resultado: texto(resultado), responsavel: name ?? email })
  if (error) return { error: 'Não foi possível registrar o contato.' }
  return pronto()
}

export async function dispensar(ciclo: string, vinculo: string, motivo: string): Promise<Resultado> {
  const { supabase, name, email } = await equipe()
  if (!texto(motivo)) return { error: 'Informe o motivo da dispensa.' }
  const { error } = await supabase.from('el_dispensas').upsert({ ciclo_id: ciclo, vinculo_id: vinculo, motivo: texto(motivo), registrado_por: name ?? email })
  if (error) return { error: 'Não foi possível dispensar.' }
  return pronto()
}

export async function desfazerDispensa(ciclo: string, vinculo: string): Promise<Resultado> {
  const { supabase } = await equipe()
  const { error } = await supabase.from('el_dispensas').delete().eq('ciclo_id', ciclo).eq('vinculo_id', vinculo)
  if (error) return { error: 'Não foi possível desfazer a dispensa.' }
  return pronto()
}

// ---------------- revisão ----------------
export type Revisao = {
  vinculo_manual: string; mes_manual: string; visitas: string; emprestimos: string; eventos: string
  decisao: '' | 'aceitar' | 'descartar'; nota: string; guardar_apelido: boolean
}

export async function revisar(id: string, d: Revisao): Promise<Resultado> {
  const { supabase, name, email } = await equipe()
  if (d.mes_manual && !ehMesIso(d.mes_manual)) return { error: 'Mês inválido.' }
  if (!['', 'aceitar', 'descartar'].includes(d.decisao)) return { error: 'Decisão inválida.' }
  const numero = (v: string) => {
    if (v.trim() === '') return null
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : NaN
  }
  const [visitas, emprestimos, eventos] = [numero(d.visitas), numero(d.emprestimos), numero(d.eventos)]
  if ([visitas, emprestimos, eventos].some(Number.isNaN)) return { error: 'Os números corrigidos precisam ser 0 ou mais.' }

  const { data: resposta, error } = await supabase.from('el_respostas').update({
    vinculo_manual: d.vinculo_manual || null, mes_manual: d.mes_manual || null,
    visitas_corrigidas: visitas, emprestimos_corrigidos: emprestimos, eventos_corrigidos: eventos,
    decisao: d.decisao || null, nota_revisao: texto(d.nota) || null,
    revisado_por: name ?? email, revisado_em: new Date().toISOString(),
  }).eq('id', id).select('escola_informada').single()
  if (error) return { error: 'Não foi possível salvar a revisão.' }

  // O nome como a escola escreveu passa a ser reconhecido sozinho nas próximas respostas
  if (d.guardar_apelido && d.vinculo_manual) {
    const { data: v } = await supabase.from('el_vinculos').select('school:schools(id, nome, apelidos)').eq('id', d.vinculo_manual).single()
    const escola = v?.school as unknown as { id: string; nome: string; apelidos: string | null } | undefined
    const nome = texto(resposta.escola_informada, 200)
    const atuais = listaPipe(escola?.apelidos)
    if (escola && nome && chaveEscola(nome) !== chaveEscola(escola.nome) && !atuais.some(a => chaveEscola(a) === chaveEscola(nome)))
      await supabase.from('schools').update({ apelidos: [...atuais, nome].join(' | ') }).eq('id', escola.id)
  }
  return pronto()
}

// ---------------- escolas ----------------
export type NovoVinculo = { school_id: string; nome: string; cidade: string; cnpj: string; project_id: string; patrocinador: string; inicio: string; fim: string }

/** Coloca uma escola (existente ou nova) em acompanhamento num projeto. */
export async function adicionarVinculo(d: NovoVinculo): Promise<Resultado> {
  const { supabase } = await equipe()
  if (!d.project_id) return { error: 'Escolha o projeto.' }
  if (d.inicio && !ehMesIso(d.inicio)) return { error: 'Início inválido.' }
  if (d.fim && (!ehMesIso(d.fim) || (d.inicio && d.fim < d.inicio))) return { error: 'O fim precisa ser depois do início.' }
  let school = d.school_id
  if (!school) {
    const nome = texto(d.nome, 200), cnpj = onlyDigits(d.cnpj)
    if (!nome) return { error: 'Informe o nome da escola.' }
    if (cnpj && cnpj.length !== 14) return { error: 'O CNPJ precisa ter 14 números (ou deixe em branco).' }
    const { data, error } = await supabase.from('schools').insert({ nome, cidade: texto(d.cidade, 120) || null, cnpj: cnpj || null }).select('id').single()
    if (error?.code === '23505') return { error: 'Já existe uma escola com esse CNPJ. Escolha-a na lista.' }
    if (error) return { error: 'Não foi possível cadastrar a escola.' }
    school = data.id
  }
  const { error } = await supabase.from('el_vinculos').insert({
    school_id: school, project_id: d.project_id, patrocinador: texto(d.patrocinador, 120) || null, inicio: d.inicio || null, fim: d.fim || null,
  })
  if (error?.code === '23505') return { error: 'Essa escola já está nesse projeto.' }
  if (error) return { error: 'Não foi possível salvar.' }
  return pronto()
}

/** Encerra no mês anterior ao atual (os meses passados continuam contando) ou retoma sem data de fim. */
export async function encerrarAcompanhamento(vinculo: string, encerrar: boolean): Promise<Resultado> {
  const { supabase } = await equipe()
  let fim: string | null = null
  if (encerrar) {
    const [a, m] = todayISO().split('-').map(Number)
    fim = m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
    const { data } = await supabase.from('el_vinculos').select('inicio').eq('id', vinculo).single()
    if (data?.inicio && data.inicio > fim) return { error: 'O acompanhamento começa depois deste mês. Ajuste o início em vez de encerrar.' }
  }
  const { error } = await supabase.from('el_vinculos').update({ fim }).eq('id', vinculo)
  if (error) return { error: 'Não foi possível mudar o acompanhamento.' }
  return pronto()
}

/** Escola que entrou "a confirmar" (sem cobrança) passa a ser cobrada todo mês. */
export async function ativarAcompanhamento(vinculo: string): Promise<Resultado> {
  const { supabase } = await equipe()
  const { error } = await supabase.from('el_vinculos').update({ acompanhar: true }).eq('id', vinculo)
  if (error) return { error: 'Não foi possível ativar o acompanhamento.' }
  return pronto()
}
