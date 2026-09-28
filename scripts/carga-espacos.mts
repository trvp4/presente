// Carga inicial do Espaços de Leitura a partir dos CSVs de Nath-Automacao/carga/saida
// (escolas, projetos, vínculos e respostas históricas das planilhas antigas).
//
//   npx tsx scripts/carga-espacos.mts <pasta dos CSVs>            → prévia: mostra o que entraria, não grava nada
//   npx tsx scripts/carga-espacos.mts <pasta dos CSVs> --gravar   → grava (pode rodar de novo: nada duplica)
//
// Escola e projeto que já existem no Presente (mesmo nome normalizado) são reaproveitados.
// Uma resposta já carregada não é sobrescrita, para não perder a revisão da Equipe.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './env.mjs'
import { chaveEscola, chaveTexto, ehMesIso, hashCurto, listaPipe } from '../lib/espacos/normalizacao'
import { paraRegras } from '../lib/espacos/banco'
import { processar } from '../lib/espacos/regras'
import { lerHora, lerObservacoes } from '../lib/plano'

const PASTA = process.argv.slice(2).find(a => !a.startsWith('--'))
if (!PASTA) { console.error('Informe a pasta dos CSVs: npx tsx scripts/carga-espacos.mts <pasta> [--gravar]'); process.exit(1) }
const GRAVAR = process.argv.includes('--gravar')

/** CSV com aspas ("" dentro de aspas = aspas), vírgula e quebras de linha dentro de campos. */
function lerCsv(arquivo: string) {
  const t = readFileSync(join(PASTA, arquivo), 'utf8').replace(/^\uFEFF/, '')
  const linhas: string[][] = []
  let campo = '', linha: string[] = [], aspas = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++ } else if (c === '"') aspas = false; else campo += c
    } else if (c === '"') aspas = true
    else if (c === ',') { linha.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      linha.push(campo); linhas.push(linha); linha = []; campo = ''
    } else campo += c
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha) }
  const [cab, ...resto] = linhas.filter(l => l.some(Boolean))
  return resto.map(l => Object.fromEntries(cab.map((k, i) => [k, (l[i] ?? '').trim()])))
}
const vazio = (v: string) => v || null

const db = adminClient()
const falhar = (o: string, e: unknown) => { console.error(`Erro em ${o}:`, e); process.exit(1) }
const ler = async (t: string, cols: string) => { const { data, error } = await db.from(t).select(cols); if (error) falhar(t, error); return data as any[] }

const csv = {
  escolas: lerCsv('carga_Escolas.csv'), projetos: lerCsv('carga_Projetos.csv'),
  vinculos: lerCsv('carga_Vinculos.csv'), respostas: lerCsv('carga_Respostas.csv'),
  capacitacoes: lerCsv('carga_Capacitacoes.csv'), participacoes: lerCsv('carga_Participacoes.csv'),
}
const [schools, projects] = await Promise.all([ler('schools', 'id, nome, apelidos, cnpj, cidade'), ler('projects', 'id, name, nomes_no_formulario, pronac')])

// ---------------- projetos ----------------
const projetoId: Record<string, string> = {}
const novosProjetos: { csv: string; name: string }[] = []
for (const p of csv.projetos) {
  const k = chaveTexto(p.nome)
  const existe = projects.find(x => [x.name, ...listaPipe(x.nomes_no_formulario)].some(n => chaveTexto(n) === k))
  if (existe) projetoId[p.projeto_id] = existe.id
  else novosProjetos.push({ csv: p.projeto_id, name: p.nome })
}

// ---------------- escolas ----------------
const escolaId: Record<string, string> = {}
const novasEscolas: { csv: string; linha: Record<string, unknown> }[] = []
const reaproveitadas: string[] = []
for (const e of csv.escolas) {
  const k = chaveEscola(e.nome)
  const existe = schools.find(x => [x.nome, ...listaPipe(x.apelidos)].some(n => chaveEscola(n) === k))
  if (existe) { escolaId[e.escola_id] = existe.id; reaproveitadas.push(`${e.nome} → ${existe.nome}${existe.cnpj ? ' (com CNPJ)' : ''}`); continue }
  novasEscolas.push({ csv: e.escola_id, linha: {
    nome: e.nome, cidade: e.municipio ? (e.uf ? `${e.municipio} – ${e.uf}` : e.municipio) : null,
    contato_nome: vazio(e.contato_nome), telefone: vazio(e.telefone), situacao: e.situacao === 'inativa' ? 'inativa' : 'ativa', observacoes: vazio(e.observacoes),
  } })
}

console.log(`\nCarga do Espaços de Leitura (${GRAVAR ? 'GRAVANDO' : 'prévia, nada é gravado'})  ·  pasta: ${PASTA}\n`)
console.log(`Projetos: ${csv.projetos.length} no CSV · ${csv.projetos.length - novosProjetos.length} já existem no Presente · ${novosProjetos.length} novos (sem Pronac)`)
console.log(`Escolas:  ${csv.escolas.length} no CSV · ${reaproveitadas.length} já existem · ${novasEscolas.length} novas`)
for (const r of reaproveitadas) console.log(`   reaproveitada: ${r}`)

if (GRAVAR) {
  if (novosProjetos.length) {
    const { data, error } = await db.from('projects').insert(novosProjetos.map(p => ({ name: p.name, pronac: null }))).select('id, name')
    if (error) falhar('projetos', error)
    for (const p of novosProjetos) projetoId[p.csv] = data!.find(d => d.name === p.name)!.id
  }
  if (novasEscolas.length) {
    const { data, error } = await db.from('schools').insert(novasEscolas.map(e => e.linha)).select('id, nome')
    if (error) falhar('escolas', error)
    novasEscolas.forEach((e, i) => { escolaId[e.csv] = data![i].id })
  }
} else {
  // prévia: ids provisórios só para simular as regras
  for (const p of novosProjetos) projetoId[p.csv] = 'novo-' + p.csv
  for (const e of novasEscolas) escolaId[e.csv] = 'novo-' + e.csv
}

// ---------------- vínculos ----------------
const vinculos = csv.vinculos.map(v => ({
  school_id: escolaId[v.escola_id], project_id: projetoId[v.projeto_id], patrocinador: vazio(v.patrocinador),
  inicio: ehMesIso(v.inicio) ? v.inicio : null, fim: ehMesIso(v.fim) ? v.fim : null,
  acompanhar: v.acompanhar === 'sim', observacoes: vazio(v.observacoes),
}))
const orfaos = vinculos.filter(v => !v.school_id || !v.project_id)
if (orfaos.length) falhar('vínculos', `${orfaos.length} vínculo(s) apontam para escola ou projeto que não está nos CSVs`)
console.log(`Vínculos: ${vinculos.length} · ${vinculos.filter(v => v.acompanhar).length} acompanhados todo mês · ${vinculos.filter(v => !v.acompanhar).length} "a confirmar" (entram sem cobrança)`)

// ---------------- respostas históricas ----------------
const ORIGINAIS = ['projeto_informado', 'escola_informada', 'mes_informado', 'visitas_texto', 'atividades_texto', 'faixa_uso_texto'] as const
const respostas = csv.respostas.map(r => ({
  id: r.resposta_id, origem: 'planilha antiga', referencia_origem: vazio(r.referencia_origem),
  hash_origem: hashCurto(ORIGINAIS.map(k => r[k] ?? '').join('␟')),
  ...Object.fromEntries(ORIGINAIS.map(k => [k, r[k] ?? ''])),
}))

// Simula as regras com o resultado da carga, para a Equipe ver antes o que vai cair na revisão
const sim = processar(paraRegras({
  schools: [...schools, ...novasEscolas.map(e => ({ id: escolaId[e.csv], ...e.linha }))],
  projects: [...projects, ...novosProjetos.map(p => ({ id: projetoId[p.csv], name: p.name, archived: false }))],
  vinculos: vinculos.map((v, i) => ({ id: 'v' + i, ...v })),
  ciclos: [], respostas: respostas.map(r => ({ ...r, carimbo: null })), dispensas: [], contatos: [], fechamentos: [],
}), new Date())
const porSituacao = sim.respostas.reduce<Record<string, number>>((m, r) => ({ ...m, [r.situacao]: (m[r.situacao] ?? 0) + 1 }), {})
console.log(`Respostas históricas: ${respostas.length} · ${Object.entries(porSituacao).map(([s, n]) => `${n} ${s}`).join(' · ')}`)
const motivos = sim.respostas.filter(r => r.situacao === 'em revisão').flatMap(r => String(r.motivos).split('; ').map(m => m.replace(/: ".*"$/, '').replace(/ESC-\w+|novo-\S+|[0-9a-f-]{36}/g, '…')))
for (const [m, n] of Object.entries(motivos.reduce<Record<string, number>>((a, m) => ({ ...a, [m]: (a[m] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]))
  console.log(`   revisão: ${n}× ${m}`)
if (sim.conflitos.length) console.log(`Conflitos no cadastro: ${sim.conflitos.join(' | ')}`)

if (GRAVAR) {
  const v = await db.from('el_vinculos').upsert(vinculos, { onConflict: 'school_id,project_id', ignoreDuplicates: true })
  if (v.error) falhar('vínculos', v.error)
  const r = await db.from('el_respostas').upsert(respostas, { onConflict: 'id', ignoreDuplicates: true })
  if (r.error) falhar('respostas', r.error)
  console.log('\nCarga gravada. Confira em /espacos/escolas e /espacos/revisao.')
}

// ---------------- plano de capacitações ----------------
const DIA = /^\d{4}-\d{2}-\d{2}$/
const escolaDoItem = Object.fromEntries(csv.participacoes.map(p => [p.capacitacao_id, escolaId[p.escola_id]]))
const plano = csv.capacitacoes.map(c => {
  const { cidade, observacoes } = lerObservacoes(c.observacoes)
  return {
    origem_id: c.capacitacao_id, project_id: projetoId[c.projeto_id], school_id: escolaDoItem[c.capacitacao_id] ?? null,
    patrocinador: vazio(c.patrocinador), tipo: c.tipo || 'Capacitação', modo: vazio(c.modo), publico: vazio(c.publico), cidade,
    data_prevista: DIA.test(c.data_prevista) ? c.data_prevista : null, hora: lerHora(c.hora),
    data_realizada: DIA.test(c.data_realizada) ? c.data_realizada : null,
    situacao: c.situacao === 'realizada' ? 'realizada' : 'planejada', responsavel: vazio(c.responsavel),
    horas: Number(c.horas) > 0 ? Number(c.horas) : null, observacoes,
  }
})
if (plano.some(p => !p.project_id)) falhar('plano', 'capacitação com projeto fora dos CSVs')
console.log(`Plano de capacitações: ${plano.length} · ${plano.filter(p => p.situacao === 'realizada').length} realizadas · ${plano.filter(p => p.data_prevista).length} com data · ${plano.filter(p => p.school_id).length} com escola`)
if (GRAVAR) {
  const r = await db.from('plano_capacitacoes').upsert(plano, { onConflict: 'origem_id', ignoreDuplicates: true })
  if (r.error) falhar('plano', r.error)
  console.log('Plano gravado. Confira em /plano.')
} else {
  console.log('\nNada foi gravado. Para gravar: npx tsx scripts/carga-espacos.mts <pasta> --gravar')
}
