// Avaliação da formação (Google Forms "Avaliação - Formação de Professores"): respostas → resultados.
import { hashCurto } from './espacos/normalizacao'

export const FORM_AVALIACAO = 'https://docs.google.com/forms/d/e/1FAIpQLSdynBEocPkeUMRRYoiPCZnV22tfUVs0o0udTCaIFczrfLM_LQ/viewform'

export type Avaliacao = { id: string; carimbo: string | null; projeto: string; respostas: Record<string, string> }

// O e-mail de quem respondeu não é guardado: os resultados não usam.
const DESCARTAR = /^(e-?mail|endere[çc]o de e-?mail)$/i

/** Envio do script do Forms → linha de av_respostas. null se o formulário não tem a pergunta do projeto. */
export function linhaDaAvaliacao(titulos: string[], valores: string[], referencia: string) {
  const respostas: Record<string, string> = {}
  let carimbo: string | null = null
  let projeto: string | null = null
  titulos.forEach((titulo, i) => {
    const t = titulo.trim(), v = String(valores[i] ?? '').trim()
    if (/^carimbo/i.test(t)) { const d = new Date(v); carimbo = isNaN(+d) ? null : d.toISOString(); return }
    if (DESCARTAR.test(t)) return
    if (projeto === null && /projeto/i.test(t)) projeto = v // "Em qual projeto foi realizada a capacitação?"
    else respostas[t] = v
  })
  if (projeto === null) return null
  const hash = hashCurto(JSON.stringify([carimbo, projeto, respostas]))
  return { id: referencia || hash, carimbo, projeto, respostas, hash_origem: hash }
}

// Escalas do formulário, da pior para a melhor. Resposta fora desta lista = pergunta aberta.
const NEGATIVAS = ['muito insatisfeito', 'insatisfeito', 'insatisfatória', 'insatisfatórios', 'insuficientes', 'baixa', 'não']
const NEUTRAS = ['talvez', 'adequada', 'adequadas', 'adequados']
const POSITIVAS = ['satisfeito', 'boa', 'boas', 'bons', 'alta', 'sim', 'muito satisfeito', 'excelente', 'excelentes']
const ORDEM = [...NEGATIVAS, ...NEUTRAS, ...POSITIVAS]
export type Tom = 'neg' | 'neutro' | 'pos'
const tomDe = (v: string): Tom => (NEGATIVAS.includes(v) ? 'neg' : NEUTRAS.includes(v) ? 'neutro' : 'pos')

export type Opcao = { rotulo: string; n: number; tom: Tom }
export type Pergunta =
  | { titulo: string; tipo: 'escala'; total: number; opcoes: Opcao[]; aprovacao: number }
  | { titulo: string; tipo: 'texto'; textos: { texto: string; projeto: string; carimbo: string | null }[] }

const numero = (t: string) => Number(t.match(/^(\d+)/)?.[1] ?? 999)

/** Agrupa as respostas por pergunta: escalas viram contagens (aprovação = % de respostas positivas), abertas viram lista. */
export function resumir(avs: Avaliacao[]) {
  const titulos = [...new Set(avs.flatMap(a => Object.keys(a.respostas)))].sort((a, b) => numero(a) - numero(b) || a.localeCompare(b))
  const perguntas: Pergunta[] = []
  for (const titulo of titulos) {
    const dadas = avs.map(a => ({ v: (a.respostas[titulo] ?? '').trim(), a })).filter(x => x.v)
    if (!dadas.length) continue
    if (dadas.every(x => ORDEM.includes(x.v.toLowerCase()))) {
      const cont = new Map<string, Opcao>()
      for (const { v } of dadas) {
        const k = v.toLowerCase()
        const o = cont.get(k) ?? { rotulo: v, n: 0, tom: tomDe(k) }
        o.n++
        cont.set(k, o)
      }
      const opcoes = [...cont.entries()].sort(([a], [b]) => ORDEM.indexOf(a) - ORDEM.indexOf(b)).map(([, o]) => o)
      const pos = opcoes.filter(o => o.tom === 'pos').reduce((s, o) => s + o.n, 0)
      perguntas.push({ titulo, tipo: 'escala', total: dadas.length, opcoes, aprovacao: pos / dadas.length })
    } else {
      const textos = dadas
        .map(({ v, a }) => ({ texto: v, projeto: a.projeto, carimbo: a.carimbo }))
        .sort((x, y) => (y.carimbo ?? '').localeCompare(x.carimbo ?? ''))
      perguntas.push({ titulo, tipo: 'texto', textos })
    }
  }
  const destaque = (re: RegExp) => {
    const p = perguntas.find(p => p.tipo === 'escala' && re.test(p.titulo))
    return p?.tipo === 'escala' ? p.aprovacao : null
  }
  return {
    total: avs.length,
    perguntas,
    satisfacao: destaque(/satisfa[çc][ãa]o geral/i),
    recomendaria: destaque(/recomendaria/i),
    participaria: destaque(/participaria/i),
  }
}
