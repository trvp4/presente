// Espaços de Leitura · relatório interno por patrocinador: números do período, situação de cada
// escola mês a mês, relatos literais das escolas (sem IA) e pontos de atenção para a Equipe.
// Porte fiel de Nath-Automacao/apps-script/Relatorio.gs.
import { chaveTexto, dois, ehMesIso, formatarData, rotuloMes } from './normalizacao'
import { SITUACAO_OBRIGACAO, SITUACAO_RESPOSTA, ehSim, type Registro } from './regras'

/** "AURORA - Cantos 8º", "Aurora" → "AURORA"; "Horizonte 2025" → "HORIZONTE". Chave para agrupar variações. */
export function chavePatrocinador(nome: unknown) {
  const base = String(nome || '').split(/\s[-–]\s/)[0].replace(/\b(19|20)\d{2}\b/g, ' ')
  return chaveTexto(base)
}

/** Patrocinadores distintos (agrupando as variações de escrita), com as formas encontradas. */
export function listarPatrocinadores(vinculos: Registro[]) {
  const grupos: Record<string, { chave: string; formas: Record<string, number>; vinculos: number; acompanhados: number }> = {}
  for (const v of vinculos) {
    const k = chavePatrocinador(v.patrocinador)
    if (!k) continue
    const g = (grupos[k] ||= { chave: k, formas: {}, vinculos: 0, acompanhados: 0 })
    const forma = String(v.patrocinador).trim()
    g.formas[forma] = (g.formas[forma] || 0) + 1
    g.vinculos++
    if (ehSim(v.acompanhar)) g.acompanhados++
  }
  return Object.keys(grupos).sort().map(k => {
    const g = grupos[k]
    const formas = Object.keys(g.formas).sort((a, b) => g.formas[b] - g.formas[a] || a.length - b.length)
    const nome = String(formas[0]).split(/\s[-–]\s/)[0].replace(/\s*\b(19|20)\d{2}\b\s*/g, ' ').trim()
    return { chave: k, nome, formas, vinculos: g.vinculos, acompanhados: g.acompanhados }
  })
}

const CAMPOS_RELATO: [string, string, 'resultados' | 'desafios'][] = [
  ['boas_praticas', 'Boas práticas', 'resultados'],
  ['impacto_comunidade', 'Impacto na comunidade', 'resultados'],
  ['alfabetizacao', 'Alfabetização', 'resultados'],
  ['atividade_mais_realizada', 'Atividade mais realizada', 'resultados'],
  ['atividades_texto', 'Atividades', 'resultados'],
  ['desafios', 'Desafios', 'desafios'],
  ['melhorias', 'O que melhorar', 'desafios'],
]
const LIMITE_RELATOS = { porEscola: 2, porTema: 8, caracteres: 420 }

function trechoRelato(texto: unknown) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim()
  if (t.length < 40 || t.split(' ').length < 6) return ''
  if (t.length <= LIMITE_RELATOS.caracteres) return t
  const corte = t.slice(0, LIMITE_RELATOS.caracteres)
  return corte.slice(0, corte.lastIndexOf(' ')) + '…'
}

function mesesDoIntervalo(de: string, ate: string) {
  const lista: string[] = []
  let a = +de.slice(0, 4), m = +de.slice(5, 7)
  while (lista.length < 60) {
    const iso = a + '-' + dois(m)
    if (iso > ate) break
    lista.push(iso)
    m++; if (m > 12) { m = 1; a++ }
  }
  return lista
}

const indexar = (lista: Registro[], chave: string) =>
  Object.fromEntries(lista.filter(x => x[chave] !== '' && x[chave] !== undefined).map(x => [x[chave], x]))

export type Tabelas = { escolas: Registro[]; projetos: Registro[]; vinculos: Registro[]; ciclos: Registro[]; obrigacoes: Registro[]; respostas: Registro[] }

/** Monta o relatório. `patrocinador` é a chave de chavePatrocinador(); `de` e `ate` são AAAA-MM. */
export function montarRelatorioPatrocinador(T: Tabelas, patrocinador: string, de: string, ate: string, agora?: Date) {
  if (!ehMesIso(de) || !ehMesIso(ate) || de > ate) throw new Error('Período inválido: use AAAA-MM, com início antes do fim.')
  const escolas = indexar(T.escolas, 'escola_id')
  const projetos = indexar(T.projetos, 'projeto_id')
  const vincs = T.vinculos.filter(v => chavePatrocinador(v.patrocinador) === patrocinador)
  if (!vincs.length) throw new Error('Nenhuma escola vinculada a este patrocinador.')
  const ids: Record<string, boolean> = Object.fromEntries(vincs.map(v => [v.vinculo_id, true]))
  const meses = mesesDoIntervalo(de, ate)
  const dentro = (m: string) => m >= de && m <= ate
  const ciclos: Record<string, Registro> = {}
  for (const c of T.ciclos) if (ehMesIso(c.ciclo_id) && dentro(c.ciclo_id)) ciclos[c.ciclo_id] = c

  const obrig: Record<string, Registro> = {}
  for (const o of T.obrigacoes) if (ids[o.vinculo_id] && dentro(o.ciclo_id) && o.situacao !== SITUACAO_OBRIGACAO.FORA) obrig[o.vinculo_id + '|' + o.ciclo_id] = o
  const validas = T.respostas.filter(r => ids[r.vinculo_id] && dentro(r.mes) && r.vigente === true && r.situacao === SITUACAO_RESPOSTA.VALIDA)
  const emRevisao = T.respostas.filter(r => ids[r.vinculo_id] && dentro(r.mes) && r.situacao === SITUACAO_RESPOSTA.REVISAO)
  const validaPor = Object.fromEntries(validas.map(r => [r.vinculo_id + '|' + r.mes, r]))

  // Resumo: taxa só nos meses com ciclo (onde se sabe quem precisava responder)
  const res = { esperadas: 0, respondidas: 0, em_revisao: 0, pendentes: 0, dispensadas: 0, respostas_validas: validas.length,
    visitas: 0, emprestimos: 0, eventos: 0, com_visitas: 0, com_emprestimos: 0, com_eventos: 0, taxa: null as number | null }
  for (const o of Object.values(obrig)) {
    const s = o.situacao
    if (s === SITUACAO_OBRIGACAO.DISPENSADA) { res.dispensadas++; continue }
    res.esperadas++
    if (s === SITUACAO_OBRIGACAO.RESPONDIDA) res.respondidas++
    else if (s === SITUACAO_OBRIGACAO.REVISAO) res.em_revisao++
    else res.pendentes++
  }
  res.taxa = res.esperadas ? Math.round(10000 * res.respondidas / res.esperadas) / 10000 : null
  const faixas: Record<string, number> = {}
  for (const r of validas) {
    if (typeof r.total_visitas === 'number') { res.visitas += r.total_visitas; res.com_visitas++ }
    if (typeof r.total_emprestimos === 'number') { res.emprestimos += r.total_emprestimos; res.com_emprestimos++ }
    if (typeof r.total_eventos === 'number') { res.eventos += r.total_eventos; res.com_eventos++ }
    const f = r.faixa_uso || 'não informado'
    faixas[f] = (faixas[f] || 0) + 1
  }

  // Grade escola × mês
  const grade = vincs.map(v => {
    const e = escolas[v.escola_id] || {}, p = projetos[v.projeto_id] || {}
    const linha = { vinculo: v.vinculo_id as string, escola: (e.nome || v.escola_id) as string, projeto: (p.nome || v.projeto_id) as string,
      municipio: e.municipio || '', uf: e.uf || '', contato: e.contato_nome || '', telefone: String(e.telefone || ''),
      acompanhar: v.acompanhar === true ? 'sim' : v.acompanhar === false ? 'não' : String(v.acompanhar || ''), meses: {} as Record<string, string>, respostas: 0, visitas: 0, pendentes_seguidos: 0 }
    for (const m of meses) {
      const o = obrig[v.vinculo_id + '|' + m], r = validaPor[v.vinculo_id + '|' + m]
      linha.meses[m] = o ? o.situacao : r ? 'respondida' : ciclos[m] ? 'não esperada' : ''
      if (r) { linha.respostas++; if (typeof r.total_visitas === 'number') linha.visitas += r.total_visitas }
    }
    for (let i = meses.length - 1; i >= 0 && linha.meses[meses[i]] === SITUACAO_OBRIGACAO.PENDENTE; i--) linha.pendentes_seguidos++
    return linha
  }).sort((a, b) => a.projeto.localeCompare(b.projeto) || a.escola.localeCompare(b.escola))

  // Relatos: trechos literais, mais recentes primeiro, com limite por escola e por tema
  const relatos: Record<'resultados' | 'desafios', { escola: string; mes: string; campo: string; texto: string }[]> = { resultados: [], desafios: [] }
  const porEscolaTema: Record<string, number> = {}, vistos: Record<string, boolean> = {}
  const nomeVinculo = Object.fromEntries(grade.map(g => [g.vinculo, g.escola]))
  for (const r of [...validas].sort((a, b) => String(b.mes).localeCompare(String(a.mes)))) {
    for (const [campo, rotulo, tema] of CAMPOS_RELATO) {
      const texto = trechoRelato(r[campo])
      if (!texto || vistos[texto] || relatos[tema].length >= LIMITE_RELATOS.porTema) continue
      const k = r.vinculo_id + '|' + tema
      if ((porEscolaTema[k] || 0) >= LIMITE_RELATOS.porEscola) continue
      porEscolaTema[k] = (porEscolaTema[k] || 0) + 1
      vistos[texto] = true
      relatos[tema].push({ escola: nomeVinculo[r.vinculo_id], mes: rotuloMes(r.mes), campo: rotulo, texto })
    }
  }

  // Pontos de atenção para a Equipe
  const atencao: string[] = []
  for (const g of grade) {
    if (g.pendentes_seguidos >= 2) atencao.push(`${g.escola} (${g.projeto}): ${g.pendentes_seguidos} meses seguidos sem responder até ${rotuloMes(ate)}`) // sem nome/telefone do contato: o texto pode ser copiado para fora
    else if (ehSim(g.acompanhar) && !g.respostas && meses.some(m => g.meses[m] === SITUACAO_OBRIGACAO.PENDENTE)) atencao.push(`${g.escola} (${g.projeto}): nenhuma resposta válida no período`)
    if (!ehSim(g.acompanhar)) atencao.push(`${g.escola} (${g.projeto}): ${g.acompanhar === 'não' ? 'fora do acompanhamento mensal' : `acompanhamento "${g.acompanhar || 'vazio'}"`} no cadastro — confirmar se deve ser cobrada`)
  }
  if (emRevisao.length) atencao.push(`${emRevisao.length} resposta(s) do período ainda em revisão: os números delas não entram nas somas`)
  if (res.respostas_validas && res.com_visitas < res.respostas_validas) atencao.push(`Visitas: ${res.com_visitas} de ${res.respostas_validas} respostas informaram número; o total está subestimado`)
  const semCiclo = meses.filter(m => !ciclos[m])
  if (semCiclo.length) atencao.push(`Meses sem ciclo aberto no sistema (${semCiclo.map(rotuloMes).join(', ')}): sem taxa de resposta para eles`)

  const grupo = listarPatrocinadores(T.vinculos).find(g => g.chave === patrocinador)!
  if (grupo.formas.length > 1) atencao.push(`O patrocinador está escrito de ${grupo.formas.length} formas no cadastro (${grupo.formas.join(', ')}): padronize em Vínculos`)

  return {
    patrocinador: grupo.nome, formas: grupo.formas, de, ate,
    periodo: rotuloMes(de) + (de === ate ? '' : ' a ' + rotuloMes(ate)),
    gerado_em: formatarData(agora || new Date(), 'dd/MM/yyyy HH:mm'),
    meses: meses.map(m => ({ id: m, rotulo: rotuloMes(m), ciclo: !!ciclos[m] })),
    projetos: [...new Set(grade.map(g => g.projeto))],
    escolas: grade.length, acompanhadas: grade.filter(g => ehSim(g.acompanhar)).length,
    resumo: res, faixas, grade, relatos, atencao,
  }
}

export type Relatorio = ReturnType<typeof montarRelatorioPatrocinador>

/** Texto corrido para colar num e-mail interno ou numa ata. */
export function textoRelatorio(r: Relatorio) {
  const s = r.resumo, pct = (v: number | null) => (v === null ? 'sem ciclo no período' : Math.round(v * 100) + '%')
  const uso: [string, number, number][] = [['visitas', s.visitas, s.com_visitas], ['empréstimos', s.emprestimos, s.com_emprestimos], ['eventos/atividades', s.eventos, s.com_eventos]]
  const linhas = [
    `Relatório interno — ${r.patrocinador} — ${r.periodo}`,
    `Projetos: ${r.projetos.join(', ')}. Escolas vinculadas: ${r.escolas} (${r.acompanhadas} em acompanhamento).`,
    `Respostas: ${s.respondidas} de ${s.esperadas} esperadas (taxa ${pct(s.taxa)}); ${s.pendentes} pendente(s), ${s.em_revisao} em revisão.`,
    'Uso informado: ' + uso.map(([nome, total, com]) => (com ? `${total} ${nome} (${com} de ${s.respostas_validas} respostas informaram)` : `${nome}: sem informação`)).join('; ') + '.',
  ]
  if (r.atencao.length) linhas.push('', 'Pontos de atenção:')
  for (const a of r.atencao) linhas.push('- ' + a)
  const rel = r.relatos.resultados.slice(0, 3)
  if (rel.length) {
    linhas.push('', 'Relatos das escolas (trechos literais):')
    for (const x of rel) linhas.push(`- ${x.escola}, ${x.mes}: "${x.texto}"`)
  }
  linhas.push('', `Gerado em ${r.gerado_em}. Visitas não equivalem a alunos diferentes.`)
  return linhas.join('\n')
}
