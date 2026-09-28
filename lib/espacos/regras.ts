// Espaços de Leitura · regras de negócio, funções puras sobre listas de registros.
// Porte fiel de Nath-Automacao/apps-script/Regras.gs; processar() é o miolo de
// Sincronizacao.gs (passos 2 a 5) sem a planilha.
import {
  PADROES, chaveEscola, chaveTexto, ehMesIso, faixaDeUso, formatarData, hashCurto, lerNumero,
  lerNumeroSecundario, listaPipe, mesReferencia, mesesEntre, semAcento, type Leitura,
} from './normalizacao'

export type Registro = Record<string, any>

export const SITUACAO_RESPOSTA = { VALIDA: 'válida', REVISAO: 'em revisão', SUBSTITUIDA: 'substituída', DESCARTADA: 'descartada', REMOVIDA: 'removida da origem' } as const
export const SITUACAO_OBRIGACAO = { RESPONDIDA: 'respondida', REVISAO: 'em revisão', PENDENTE: 'pendente', DISPENSADA: 'dispensada', FORA: 'fora do ciclo' } as const

// Formulário → campos originais da resposta
/** Campo da resposta ← trechos do enunciado da pergunta (sem acento, minúsculo). Ordem importa. */
const PERGUNTAS: [string, string[]][] = [
  ['carimbo', ['carimbo de data', 'timestamp']],
  ['email_respondente', ['endereco de e-mail', 'e-mail', 'email']],
  ['projeto_informado', ['projeto recebido']],
  ['escola_informada', ['instituicao recebeu', 'qual a instituicao']],
  ['mes_informado', ['em que mes', 'mes de referencia']],
  ['atores', ['atores envolvidos']],
  ['rede', ['rede de atores']],
  ['potenciais', ['principais potenciais']],
  ['desafios', ['principais desafios']],
  ['faixa_uso_texto', ['percentual de alunos']],
  ['visitas_texto', ['utilizacao do espaco', 'total de visitas']],
  ['emprestimos_texto', ['emprestimo de livros']],
  ['atividades_texto', ['de acordo com as atividades', 'total de eventos']],
  ['cronograma', ['cronograma mensal']],
  ['atividades_turmas', ['quais turmas']],
  ['atividade_mais_realizada', ['atividade mais realizada']],
  ['faixa_etaria', ['faixa etaria']],
  ['fora_cronograma', ['alem do seguimento']],
  ['planejadas', ['sendo planejadas']],
  ['perc_atrativa', ['biblioteca atrativa']],
  ['perc_encontra', ['encontrar os livros']],
  ['perc_desempenho', ['desempenho dos alunos']],
  ['perc_integracao', ['integracao da biblioteca']],
  ['perc_comunidade', ['necessidades da comunidade']],
  ['boas_praticas', ['boas praticas']],
  ['alfabetizacao', ['alfabetizacao']],
  ['impacto_comunidade', ['impactou dentro da comunidade']],
  ['melhorias', ['podemos melhorar']],
  ['anexos', ['anexos']],
]
/** Campos que vêm do formulário (o conteúdo original da resposta). */
export const CAMPOS_ORIGINAIS = PERGUNTAS.map(([campo]) => campo)

/** Sem estas perguntas não dá para identificar nada: a resposta não deve ser gravada. */
export const PERGUNTAS_ESSENCIAIS = ['carimbo', 'projeto_informado', 'escola_informada', 'mes_informado']

/** Casa os títulos das colunas do Forms com os campos; cada título só é usado uma vez. */
export function mapearPerguntas(titulos: string[]) {
  const norm = titulos.map(t => semAcento(t).toLowerCase().replace(/\s+/g, ' ').trim())
  const usados: Record<number, boolean> = {}, mapa: Record<string, number> = {}, faltando: string[] = []
  for (const [campo, trechos] of PERGUNTAS) {
    for (let i = 0; i < trechos.length && mapa[campo] === undefined; i++) {
      for (let c = 0; c < norm.length; c++) {
        if (!usados[c] && norm[c].includes(trechos[i])) { mapa[campo] = c; usados[c] = true; break }
      }
    }
    if (mapa[campo] === undefined) faltando.push(campo)
  }
  return { mapa, faltando }
}

/** Uma linha do Forms → objeto com os campos originais + id e hash (o mesmo envio gera sempre o mesmo id). */
export function respostaDoFormulario(linha: unknown[], mapa: Record<string, number>, numeroLinha: number | string): Registro {
  const r: Registro = { origem: 'formulário', referencia_origem: 'linha ' + numeroLinha }
  for (const [campo] of PERGUNTAS) {
    const v = mapa[campo] === undefined ? '' : linha[mapa[campo]]
    r[campo] = v ?? ''
  }
  if (!(r.carimbo instanceof Date)) r.carimbo = r.carimbo ? new Date(r.carimbo) : ''
  if (r.carimbo instanceof Date && isNaN(r.carimbo.getTime())) r.carimbo = ''
  const quando = r.carimbo instanceof Date ? formatarData(r.carimbo, 'yyyyMMddHHmmss') : 'SEMDATA' + numeroLinha
  r.resposta_id = 'F-' + quando + '-' + hashCurto(String(r.email_respondente).toLowerCase() + '|' + chaveEscola(r.escola_informada)).slice(0, 4)
  r.hash_origem = hashCurto(linha.map(v => (v instanceof Date ? v.getTime() : String(v))).join('␟'))
  return r
}

// Cadastro
export const ehSim = (v: unknown) => v === true || /^(s|sim|true|1|x)$/i.test(String(v).trim())
export const ehNao = (v: unknown) => v === false || /^(n|nao|não|false|0)$/i.test(String(v).trim())

export type Cadastro = {
  escolaPorChave: Record<string, Registro>; escolaPorId: Record<string, Registro>
  projetoPorChave: Record<string, Registro>; projetoPorId: Record<string, Registro>
  vinculoPorId: Record<string, Registro>; vinculoPorPar: Record<string, Registro>; conflitos: string[]
}

export function montarCadastro(escolas: Registro[], projetos: Registro[], vinculos: Registro[]): Cadastro {
  const cad: Cadastro = { escolaPorChave: {}, escolaPorId: {}, projetoPorChave: {}, projetoPorId: {}, vinculoPorId: {}, vinculoPorPar: {}, conflitos: [] }
  for (const e of escolas) {
    if (!e.escola_id) continue
    cad.escolaPorId[e.escola_id] = e
    for (const n of [e.nome, ...listaPipe(e.apelidos)]) {
      const k = chaveEscola(n)
      if (!k) continue
      const outra = cad.escolaPorChave[k]
      if (outra && outra.escola_id !== e.escola_id) cad.conflitos.push(`"${n}" aponta para ${outra.escola_id} e ${e.escola_id}`)
      else cad.escolaPorChave[k] = e
    }
  }
  for (const p of projetos) {
    if (!p.projeto_id) continue
    cad.projetoPorId[p.projeto_id] = p
    for (const n of [p.nome, ...listaPipe(p.nomes_no_formulario)]) {
      const k = chaveTexto(n)
      if (k && !cad.projetoPorChave[k]) cad.projetoPorChave[k] = p
    }
  }
  for (const v of vinculos) {
    if (!v.vinculo_id) continue
    cad.vinculoPorId[v.vinculo_id] = v
    const par = v.escola_id + '|' + v.projeto_id
    if (cad.vinculoPorPar[par]) cad.conflitos.push(`vínculos repetidos para ${par}: ${cad.vinculoPorPar[par].vinculo_id}, ${v.vinculo_id}`)
    else cad.vinculoPorPar[par] = v
  }
  return cad
}

// Resposta → campos derivados (vínculo, mês, números, situação)
export function identificarVinculo(r: Registro, cad: Cadastro) {
  const escola = cad.escolaPorChave[chaveEscola(r.escola_informada)]
  const projeto = cad.projetoPorChave[chaveTexto(r.projeto_informado)]
  if (!escola) return { vinculo: '', motivo: `escola não identificada: "${String(r.escola_informada).trim()}"` }
  if (!projeto) return { vinculo: '', motivo: `projeto não reconhecido: "${String(r.projeto_informado).trim()}"` }
  const v = cad.vinculoPorPar[escola.escola_id + '|' + projeto.projeto_id]
  if (!v) return { vinculo: '', motivo: `${escola.escola_id} não tem vínculo com ${projeto.projeto_id}` }
  return { vinculo: v.vinculo_id as string, motivo: '' }
}

function numeroComCorrecao(texto: unknown, corrigido: unknown, padroes: RegExp[]): Leitura {
  if (corrigido !== '' && corrigido !== null && corrigido !== undefined) {
    const c = lerNumero(corrigido, [])
    if (c.estado === 'informado') return { valor: c.valor, estado: 'corrigido' }
  }
  return lerNumero(texto, padroes)
}

/** Calcula os campos derivados de uma resposta. Não decide vigência (ver aplicarVigencia). */
export function derivarResposta(r: Registro, cad: Cadastro): Registro {
  const d: Registro = {}, motivos: string[] = []

  const id = identificarVinculo(r, cad)
  d.vinculo_auto = id.vinculo
  const manual = String(r.vinculo_manual || '').trim()
  if (manual && !cad.vinculoPorId[manual]) motivos.push('vínculo manual inexistente: ' + manual)
  d.vinculo_id = manual && cad.vinculoPorId[manual] ? manual : id.vinculo
  if (!d.vinculo_id && id.motivo) motivos.push(id.motivo)

  d.mes_auto = mesReferencia(r.mes_informado, r.carimbo instanceof Date ? r.carimbo : null)
  const mesManual = String(r.mes_manual || '').trim()
  d.mes = ehMesIso(mesManual) ? mesManual : d.mes_auto
  if (mesManual && !ehMesIso(mesManual)) motivos.push('mês manual inválido (use AAAA-MM): ' + mesManual)
  if (!d.mes) motivos.push(`mês não reconhecido: "${String(r.mes_informado).trim()}"`)
  else if (r.carimbo instanceof Date && d.mes > formatarData(r.carimbo, 'yyyy-MM')) motivos.push('mês de referência posterior ao envio')

  const vis = numeroComCorrecao(r.visitas_texto, r.visitas_corrigidas, PADROES.visitas)
  const emp = numeroComCorrecao(r.emprestimos_texto, r.emprestimos_corrigidos, PADROES.emprestimos)
  const eve = numeroComCorrecao(r.atividades_texto, r.eventos_corrigidos, PADROES.eventos)
  d.total_visitas = vis.valor; d.visitas_estado = vis.estado
  d.total_emprestimos = emp.valor; d.emprestimos_estado = emp.estado
  d.total_eventos = eve.valor; d.eventos_estado = eve.estado
  d.media_diaria = lerNumeroSecundario(r.visitas_texto, PADROES.mediaDiaria).valor
  d.media_emprestimos = lerNumeroSecundario(r.emprestimos_texto, PADROES.mediaEmprestimos).valor
  d.part_leitura = lerNumeroSecundario(r.atividades_texto, PADROES.partLeitura).valor
  d.part_oficinas = lerNumeroSecundario(r.atividades_texto, PADROES.partOficinas).valor
  d.part_outros = lerNumeroSecundario(r.atividades_texto, PADROES.partOutros).valor
  d.faixa_uso = faixaDeUso(r.faixa_uso_texto)
  if (vis.estado === 'não lido') motivos.push('visitas: número não encontrado no texto')
  if (emp.estado === 'não lido') motivos.push('empréstimos: número não encontrado no texto')
  if (eve.estado === 'não lido') motivos.push('eventos: número não encontrado no texto')

  const decisao = semAcento(r.decisao).toLowerCase().trim()
  if (decisao === 'descartar') {
    d.situacao = SITUACAO_RESPOSTA.DESCARTADA
  } else if (decisao === 'aceitar' && d.vinculo_id && d.mes) {
    d.situacao = SITUACAO_RESPOSTA.VALIDA
    if (motivos.length) motivos.unshift('aceita na revisão')
  } else {
    if (decisao === 'aceitar') motivos.unshift('aceite exige vínculo e mês identificados')
    d.situacao = motivos.length ? SITUACAO_RESPOSTA.REVISAO : SITUACAO_RESPOSTA.VALIDA
  }
  d.motivos = motivos.join('; ')
  d.vigente = false
  return d
}

/**
 * Uma resposta vigente por vínculo e mês: a enviada por último. As demais ficam "substituída"
 * e continuam guardadas. Descartadas ou removidas não concorrem. Altera os objetos recebidos.
 */
export function aplicarVigencia(respostas: Registro[]) {
  const grupos: Record<string, Registro[]> = {}
  for (const r of respostas) {
    r.vigente = false
    if (!r.vinculo_id || !r.mes) continue
    if (r.situacao !== SITUACAO_RESPOSTA.VALIDA && r.situacao !== SITUACAO_RESPOSTA.REVISAO) continue
    ;(grupos[r.vinculo_id + '|' + r.mes] ||= []).push(r)
  }
  for (const g of Object.values(grupos)) {
    g.sort((a, b) => {
      const ta = a.carimbo instanceof Date ? a.carimbo.getTime() : 0
      const tb = b.carimbo instanceof Date ? b.carimbo.getTime() : 0
      return tb - ta || String(b.resposta_id).localeCompare(String(a.resposta_id))
    })
    g[0].vigente = true
    for (let i = 1; i < g.length; i++) {
      g[i].situacao = SITUACAO_RESPOSTA.SUBSTITUIDA
      g[i].motivos = ['substituída por ' + g[0].resposta_id, ...(g[i].motivos ? [g[i].motivos] : [])].join('; ')
    }
  }
  return respostas
}

// Ciclos e obrigações
/** O vínculo precisa responder no mês? */
export function vinculoEsperado(v: Registro, mes: string, cad: Cadastro) {
  if (!ehSim(v.acompanhar)) return false
  if (ehMesIso(v.inicio) && mes < v.inicio) return false
  if (ehMesIso(v.fim) && mes > v.fim) return false
  const escola = cad.escolaPorId[v.escola_id]
  if (!escola || /inativ/i.test(semAcento(escola.situacao))) return false
  const projeto = cad.projetoPorId[v.projeto_id]
  if (!projeto || ehNao(projeto.ativo)) return false
  return true
}

/**
 * Obrigações de todos os ciclos. Mantém as existentes (e os campos da Equipe), cria as que
 * faltam e marca "fora do ciclo" quem deixou de ser esperado.
 */
export function calcularObrigacoes(ciclos: Registro[], cad: Cadastro, respostas: Registro[], existentes: Registro[], contatos: Registro[]) {
  const vigentePorPar: Record<string, Registro> = {}, ultimaValida: Record<string, string[]> = {}
  for (const r of respostas) {
    if (!r.vigente) continue
    vigentePorPar[r.vinculo_id + '|' + r.mes] = r
    if (r.situacao === SITUACAO_RESPOSTA.VALIDA) (ultimaValida[r.vinculo_id] ||= []).push(r.mes)
  }
  const ultimoContato: Record<string, Date> = {}
  for (const c of contatos) {
    const d = c.data instanceof Date ? c.data : c.data ? new Date(c.data) : null
    if (!c.obrigacao_id || !d || isNaN(d.getTime())) continue
    if (!ultimoContato[c.obrigacao_id] || d > ultimoContato[c.obrigacao_id]) ultimoContato[c.obrigacao_id] = d
  }

  const porId: Record<string, Registro> = {}
  for (const o of existentes) if (o.obrigacao_id) porId[o.obrigacao_id] = o
  for (const c of ciclos) {
    if (!ehMesIso(c.ciclo_id)) continue
    for (const vid of Object.keys(cad.vinculoPorId)) {
      if (!vinculoEsperado(cad.vinculoPorId[vid], c.ciclo_id, cad)) continue
      const id = c.ciclo_id + '|' + vid
      porId[id] ||= { obrigacao_id: id, ciclo_id: c.ciclo_id, vinculo_id: vid, dispensa: '', motivo_dispensa: '' }
    }
  }

  return Object.keys(porId).sort().map(id => {
    const o = porId[id]
    const v = cad.vinculoPorId[o.vinculo_id]
    const r = vigentePorPar[o.vinculo_id + '|' + o.ciclo_id]
    const anteriores = (ultimaValida[o.vinculo_id] || []).filter(m => m <= o.ciclo_id).sort()
    const ultima = anteriores.length ? anteriores[anteriores.length - 1] : ''
    let s: string
    if (!v || !vinculoEsperado(v, o.ciclo_id, cad)) s = SITUACAO_OBRIGACAO.FORA
    else if (ehSim(o.dispensa)) s = SITUACAO_OBRIGACAO.DISPENSADA
    else if (r && r.situacao === SITUACAO_RESPOSTA.VALIDA) s = SITUACAO_OBRIGACAO.RESPONDIDA
    else if (r) s = SITUACAO_OBRIGACAO.REVISAO
    else s = SITUACAO_OBRIGACAO.PENDENTE
    o.situacao = s
    o.resposta_id = r ? r.resposta_id : ''
    o.ultima_resposta = ultima
    o.meses_sem_responder = s === SITUACAO_OBRIGACAO.PENDENTE ? (ultima ? mesesEntre(ultima, o.ciclo_id) : 'nunca respondeu') : ''
    o.ultimo_contato = ultimoContato[id] || ''
    return o
  })
}

/** Indicadores de um ciclo. Números só das respostas que contam como respondidas. */
export function indicadoresCiclo(cicloId: string, obrigacoes: Registro[], respostasPorId: Record<string, Registro>) {
  const ind: Registro = { esperadas: 0, respondidas: 0, em_revisao: 0, pendentes: 0, dispensadas: 0, visitas: 0, emprestimos: 0, eventos: 0, respostas_com_visitas: 0 }
  for (const o of obrigacoes) {
    if (o.ciclo_id !== cicloId || o.situacao === SITUACAO_OBRIGACAO.FORA) continue
    if (o.situacao === SITUACAO_OBRIGACAO.DISPENSADA) { ind.dispensadas++; continue }
    ind.esperadas++
    if (o.situacao === SITUACAO_OBRIGACAO.PENDENTE) ind.pendentes++
    if (o.situacao === SITUACAO_OBRIGACAO.REVISAO) ind.em_revisao++
    if (o.situacao !== SITUACAO_OBRIGACAO.RESPONDIDA) continue
    ind.respondidas++
    const r = respostasPorId[o.resposta_id]
    if (!r) continue
    if (typeof r.total_visitas === 'number') { ind.visitas += r.total_visitas; ind.respostas_com_visitas++ }
    if (typeof r.total_emprestimos === 'number') ind.emprestimos += r.total_emprestimos
    if (typeof r.total_eventos === 'number') ind.eventos += r.total_eventos
  }
  ind.taxa_resposta = ind.esperadas ? Math.round(10000 * ind.respondidas / ind.esperadas) / 10000 : ''
  return ind
}

const CAMPOS_FECHAMENTO = ['esperadas', 'respondidas', 'em_revisao', 'pendentes', 'dispensadas', 'taxa_resposta', 'visitas', 'emprestimos', 'eventos']

/** Ciclos encerrados guardam uma versão do resultado; se algo mudar depois, nova versão (a anterior fica). */
export function novosFechamentos(ciclos: Registro[], indicadoresPorCiclo: Record<string, Registro>, fechamentos: Registro[], agora: Date) {
  const ultima: Record<string, Registro> = {}
  for (const f of fechamentos) if (!ultima[f.ciclo_id] || +f.versao > +ultima[f.ciclo_id].versao) ultima[f.ciclo_id] = f
  const novos: Registro[] = []
  for (const c of ciclos) {
    if (!/encerrad/i.test(semAcento(c.situacao)) || !indicadoresPorCiclo[c.ciclo_id]) continue
    const ind = indicadoresPorCiclo[c.ciclo_id]
    const assinatura = hashCurto(CAMPOS_FECHAMENTO.map(k => ind[k]).join('|'))
    const ant = ultima[c.ciclo_id]
    if (ant && ant.assinatura === assinatura) continue
    const versao = ant ? +ant.versao + 1 : 1
    const f: Registro = { fechamento_id: c.ciclo_id + '-v' + versao, ciclo_id: c.ciclo_id, versao, registrado_em: agora, assinatura }
    for (const k of CAMPOS_FECHAMENTO) f[k] = ind[k]
    novos.push(f)
    ultima[c.ciclo_id] = f
  }
  return novos
}

/** Versão vigente do resultado de cada ciclo. */
export function versaoPorCiclo(fechamentos: Registro[]) {
  const v: Record<string, number> = {}
  for (const f of fechamentos) if (!v[f.ciclo_id] || +f.versao > v[f.ciclo_id]) v[f.ciclo_id] = +f.versao
  return v
}

/**
 * Recalcula tudo a partir do estado atual (passos 2 a 5 da antiga sincronização):
 * derivados de cada resposta, vigência, obrigações, indicadores por ciclo e novas versões de fechamento.
 * Idempotente: rodar de novo sem mudança no estado dá o mesmo resultado.
 */
export function processar(estado: {
  escolas: Registro[]; projetos: Registro[]; vinculos: Registro[]; ciclos: Registro[]
  respostas: Registro[]; obrigacoes: Registro[]; contatos: Registro[]; fechamentos: Registro[]
}, agora: Date) {
  const cad = montarCadastro(estado.escolas, estado.projetos, estado.vinculos)
  const respostas = estado.respostas
  for (const r of respostas) {
    if (r.situacao === SITUACAO_RESPOSTA.REMOVIDA) { r.vigente = false; continue }
    Object.assign(r, derivarResposta(r, cad))
  }
  aplicarVigencia(respostas.filter(r => r.situacao !== SITUACAO_RESPOSTA.REMOVIDA))

  const obrigacoes = calcularObrigacoes(estado.ciclos, cad, respostas, estado.obrigacoes, estado.contatos)
  const respostasPorId = Object.fromEntries(respostas.map(r => [r.resposta_id, r]))
  const indicadores: Record<string, Registro> = {}
  for (const c of estado.ciclos) if (ehMesIso(c.ciclo_id)) indicadores[c.ciclo_id] = indicadoresCiclo(c.ciclo_id, obrigacoes, respostasPorId)

  const novos = novosFechamentos(estado.ciclos, indicadores, estado.fechamentos, agora)
  const versoes = versaoPorCiclo([...estado.fechamentos, ...novos])
  const ciclos = estado.ciclos.map(c => (indicadores[c.ciclo_id] ? { ...c, ...indicadores[c.ciclo_id], versao_resultado: versoes[c.ciclo_id] || '' } : c))
  return { cadastro: cad, respostas, obrigacoes, ciclos, novosFechamentos: novos, conflitos: cad.conflitos }
}

/**
 * Um envio do Google Forms chegando ao hub (títulos das perguntas + valores).
 * Mesmo envio de novo não duplica; envio editado atualiza só os campos originais (os da Equipe ficam);
 * formulário sem as perguntas essenciais é recusado sem mexer em nada.
 */
export function incorporarEnvio(respostas: Registro[], titulos: string[], valores: unknown[], referencia: string) {
  const { mapa, faltando } = mapearPerguntas(titulos)
  const essenciais = PERGUNTAS_ESSENCIAIS.filter(c => faltando.includes(c))
  if (essenciais.length) return { acao: 'recusada' as const, motivo: `perguntas do formulário não encontradas: ${essenciais.join(', ')} (o formulário mudou?)` }
  const nova = respostaDoFormulario(valores, mapa, referencia)
  // ponytail: o id é carimbo (segundo) + e-mail + escola; dois envios diferentes da mesma escola no mesmo
  // segundo seriam tratados como edição. Se acontecer, incluir o id da resposta do Forms no id.
  const atual = respostas.find(r => r.resposta_id === nova.resposta_id)
  if (!atual) { respostas.push(nova); return { acao: 'nova' as const, resposta: nova } }
  if (atual.hash_origem === nova.hash_origem) return { acao: 'igual' as const, resposta: atual }
  Object.assign(atual, nova)
  return { acao: 'editada' as const, resposta: atual }
}
