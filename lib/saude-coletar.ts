import 'server-only'
// Saúde do sistema: busca os dados, roda as verificações (lib/saude.ts), grava a conferência e atualiza os achados.
// Chamado de hora em hora pela tarefa agendada (app/api/saude/coletar) e pelo botão "Conferir agora" da tela.
import type { SupabaseClient } from '@supabase/supabase-js'
import { carregarEspacos, cicloPadrao } from './espacos/banco'
import { idDaPlanilha } from './espacos/planilha'
import { planoDeAchados, planoDosRamos, REPOSITORIO, verificar, type AchadoAtual, type Dados, type RamoDoAgente } from './saude'

const ultima = async (admin: SupabaseClient, tabela: string, coluna: string, filtro?: [string, string]) => {
  let q = admin.from(tabela).select(coluna).order(coluna, { ascending: false }).limit(1)
  if (filtro) q = q.eq(filtro[0], filtro[1])
  const { data } = await q
  return ((data?.[0] as Record<string, string> | undefined)?.[coluna]) ?? null
}

export async function coletar(admin: SupabaseClient, origem: 'agendada' | 'manual', agora = new Date()) {
  const t0 = Date.now()
  const { error: erroBanco } = await admin.from('projects').select('id', { head: true, count: 'exact' })
  const ms = Date.now() - t0

  let dados: Dados
  if (erroBanco) {
    dados = { agora, banco: { ok: false, ms: null }, rodadaAnterior: null, listas: [], espacos: null, ultimaAvaliacao: null, ultimoBackup: null }
  } else {
    const [rodadaAnterior, listas, es, ultimaResposta, ultimaAvaliacao, ultimoBackup] = await Promise.all([
      ultima(admin, 'saude_rodadas', 'quando', ['origem', 'agendada']),
      admin.from('trainings').select('id, title, date, start_time, end_time, state, keep_open_hours, open_until, pdf_sent_at').then(r => r.data ?? []),
      carregarEspacos(admin, agora).catch(() => null),
      ultima(admin, 'el_respostas', 'recebido_em'),
      ultima(admin, 'av_respostas', 'recebido_em'),
      ultima(admin, 'saude_eventos', 'quando', ['tipo', 'backup']),
    ])
    const ciclo = es ? cicloPadrao(es.ciclos) : null
    dados = {
      agora, banco: { ok: true, ms }, rodadaAnterior, listas: listas as Dados['listas'],
      espacos: es ? {
        planilhaConfigurada: Boolean(idDaPlanilha(process.env.PLANILHA_ESPACOS ?? '') && process.env.GOOGLE_CONTA_SERVICO),
        ultimaResposta, revisao: es.revisao.length,
        pendentesMes: ciclo ? es.obrigacoes.filter(o => o.ciclo_id === ciclo.ciclo_id && o.situacao === 'pendente').length : 0,
        mes: ciclo ? String(ciclo.ciclo_id) : null,
      } : null,
      ultimaAvaliacao, ultimoBackup,
    }
  }

  const verificacoes = verificar(dados)
  if (erroBanco) return { verificacoes, gravado: false }

  const resultado = verificacoes.map(({ chave, nome, status, valor, detalhe }) => ({ chave, nome, status, valor, detalhe }))
  const { error } = await admin.from('saude_rodadas').insert({ origem, ms_banco: ms, resultado })
  if (error) console.error(`saúde: conferência não gravada: ${error.message}`)

  const { data: atuais } = await admin.from('achados').select('id, estado, origem, verificacao')
  const { abrir, resolver } = planoDeAchados(verificacoes, atuais ?? [])
  const quando = agora.toISOString()
  if (abrir.length) {
    const { error: e } = await admin.from('achados').upsert(abrir.map(a => ({
      ...a, estado: 'aberto', origem: 'verificacao', criado_em: quando, atualizado_em: quando, resolvido_em: null, resolvido_por: null,
    })))
    if (e) console.error(`saúde: achados não abertos: ${e.message}`)
  }
  if (resolver.length) {
    const { error: e } = await admin.from('achados').update({ estado: 'resolvido', resolvido_em: quando, resolvido_por: 'verificação automática', atualizado_em: quando }).in('id', resolver)
    if (e) console.error(`saúde: achados não resolvidos: ${e.message}`)
  }
  const agente = await sincronizarAgente(admin, atuais ?? [], quando)
  return { verificacoes, gravado: !error, abertos: abrir.length + agente.abertos, resolvidos: resolver.length + agente.resolvidos }
}

// Correções do agente diário: ramos agente/… do repositório público no GitHub (sem chave; limite de 60 consultas/h).
// Se o GitHub não responder, não mexe em nada (não resolve achados por falta de resposta).
async function sincronizarAgente(admin: SupabaseClient, atuais: AchadoAtual[], quando: string) {
  const gh = (caminho: string) => fetch(`https://api.github.com/repos/${REPOSITORIO}${caminho}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'presente-saude' },
  })
  try {
    const r = await gh('/branches?per_page=100')
    if (!r.ok) throw new Error(`GitHub respondeu ${r.status}`)
    const nomes = ((await r.json()) as { name: string }[]).map(b => b.name).filter(n => n.startsWith('agente/'))
    const conhecidos = new Set(atuais.map(a => a.id))
    const ramos: RamoDoAgente[] = []
    for (const nome of nomes) {
      if (conhecidos.has(`ACH-${nome.replace('/', '-')}`.slice(0, 120))) { ramos.push({ nome, mensagem: '' }); continue } // já tem achado: não gasta consulta
      const c = await gh(`/commits/${encodeURIComponent(nome)}`)
      const mensagem = c.ok ? ((await c.json()) as { commit: { message: string } }).commit.message : nome
      ramos.push({ nome, mensagem })
    }
    const { abrir, resolver } = planoDosRamos(ramos, atuais)
    if (abrir.length) {
      const { error } = await admin.from('achados').upsert(abrir.map(a => ({ ...a, origem: 'agente', verificacao: null, criado_em: quando, atualizado_em: quando })))
      if (error) console.error(`saúde: correções do agente não registradas: ${error.message}`)
    }
    if (resolver.length) {
      const { error } = await admin.from('achados').update({ estado: 'resolvido', resolvido_em: quando, resolvido_por: 'ramo aceito ou descartado no GitHub', atualizado_em: quando }).in('id', resolver)
      if (error) console.error(`saúde: correções do agente não resolvidas: ${error.message}`)
    }
    return { abertos: abrir.length, resolvidos: resolver.length }
  } catch (e) {
    console.error(`saúde: não consegui ler os ramos do agente no GitHub: ${(e as Error).message}`)
    return { abertos: 0, resolvidos: 0 }
  }
}
