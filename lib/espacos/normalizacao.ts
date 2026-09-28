// Espaços de Leitura · normalização: texto livre das escolas → chaves e números.
// Porte fiel de Nath-Automacao/apps-script/Normalizacao.gs (mesmas regras e testes).

export const FUSO = 'America/Sao_Paulo'

/** Número lido de um campo: informado (inclui 0), vazio, não lido (texto sem número seguro) ou corrigido pela Equipe. */
export type Leitura = { valor: number | ''; estado: 'informado' | 'vazio' | 'não lido' | 'corrigido' }

// Nome da escola → chave estável ("E.M. Profª Ana" e "Escola Municipal Ana" → "EM ANA")
const PREFIXOS_ESCOLA: [RegExp, string][] = [
  [/\bescola\s+municipal\s+de\s+ensino\s+fundamental\b/, 'emef'],
  [/\bescola\s+municipal\s+de\s+educacao\s+infantil\b/, 'emei'],
  [/\bescola\s+municipal\s+c[ií]vico\s+militar\b/, 'em'],
  [/\bescola\s+municipal\b/, 'em'],
  [/\bescola\s+estadual\s+de\s+ensino\s+fundamental\b/, 'eeef'],
  [/\bescola\s+estadual\b/, 'ee'],
  [/\bescola\s+supervisora\b/, 'esc'],
  [/\bcreche\s+escola\b/, 'creche'],
  [/\bcentro\s+de\s+educacao\s+infantil\b/, 'cei'],
  [/\be\s*\.?\s*m\s*\.?\s*e\s*\.?\s*f\s*\.?\b/, 'emef'],
  [/\be\s*\.?\s*m\s*\.?\s*e\s*\.?\s*i\s*\.?\b/, 'emei'],
  [/\be\s*\.?\s*e\s*\.?\s*e\s*\.?\s*f\s*\.?\b/, 'eeef'],
  [/\be\s*\.?\s*m\s*\.?\b/, 'em'],
  [/\be\s*\.?\s*e\s*\.?\b/, 'ee'],
]
const TITULOS_PESSOA = /\b(professora|professor|profa|prof|diretora|diretor|sra|sr|dr|dra)\b/g

export const semAcento = (texto: unknown) =>
  String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')

export function chaveEscola(nome: unknown) {
  let t = semAcento(nome).toLowerCase().replace(/['"´`]/g, ' ').replace(/ª|º/g, ' ')
  for (const [re, sub] of PREFIXOS_ESCOLA) {
    const novo = t.replace(re, sub + ' ')
    if (novo !== t) { t = novo; break }
  }
  t = t.replace(TITULOS_PESSOA, ' ')
  return t.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase()
}

/** Comparação tolerante de rótulos curtos (projeto, patrocinador). "Cantos de Leitura 9º" = "CANTOS DE LEITURA 9". */
export const chaveTexto = (v: unknown) => semAcento(v).toUpperCase().replace(/[º°ª]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim()

/** "a | b|c" → ['a','b','c'] sem vazios. */
export const listaPipe = (v: unknown) => String(v || '').split('|').map(s => s.trim()).filter(Boolean)

// Números dentro de texto livre
export const PADROES = {
  visitas: [
    /total\s+de\s+visitas\D{0,25}?(\d[\d.]*)/,
    /totalizando(?:\s+em\s+media)?\s+(\d[\d.]*)\s+visita/,
    /total\s+de\s+(\d[\d.]*)\s+visita/,
    /um\s+total\s+de\s+(\d[\d.]*)/,
    /(\d[\d.]*)\s+visitas?\s+(?:por|no)\s+mes/,
    /(\d[\d.]*)\s+visitas?\s+mensais/,
    /(\d[\d.]*)\s+(?:visitas?\s+)?por\s+mes/,
    /mes[:\s]+(?:mais\s+ou\s+menos\s+)?(\d[\d.]*)/,
    /(\d[\d.]*)\s+criancas?\s+no\s+mes/,
  ],
  mediaDiaria: [
    /media\s+diaria\D{0,25}?(\d[\d.,]*)/,
    /media\s+de\s+(\d[\d.,]*)\s+visitas?\s+(?:por|ao)\s+dia/,
    /(\d[\d.,]*)\s+visitantes?\s+ao\s+dia/,
    /(\d[\d.,]*)\s+visitas?\s+(?:por|ao)\s+dia/,
    /diaria[:\s]+(\d[\d.,]*)/,
    /(\d[\d.,]*)\s+criancas?\s+diaria/,
  ],
  emprestimos: [
    /total\s+de\s+livros\s+emprestados\D{0,25}?(\d[\d.]*)/,
    /total\s+de\s+(\d[\d.]*)\s+livros?/,
    /(\d[\d.]*)\s+livros?\s+emprestados/,
    /emprestados[:\s]+(\d[\d.]*)/,
  ],
  mediaEmprestimos: [/media\s+de\s+livros\D{0,25}?(\d[\d.,]*)/, /por\s+aluno\D{0,10}?(\d[\d.,]*)/],
  eventos: [
    /total\s+de\s+eventos\D{0,40}?(\d[\d.]*)/,
    /(\d[\d.]*)\s+eventos?/,
    /foram\s+(\d[\d.]*)\s+atividades/,
    /(\d[\d.]*)\s+atividades?\s+realizadas/,
    /(\d[\d.]*)\s+atividades?\s+de\s+leitura/,
    /atividades?\s+(\d[\d.]*)\b/,
  ],
  partLeitura: [/atividades\s+de\s+leitura\D{0,20}?(\d{1,5})/],
  partOficinas: [/oficinas?\D{0,30}?(\d{1,5})/],
  partOutros: [/outros\D{0,20}?(\d{1,5})/],
}

/** Respostas que significam zero de fato ("nenhuma", "não houve"). */
const ZERO_EM_TEXTO = /^(zero|nenhum[a]?|nao\s+houve(\s+\w+)?|nao\s+teve(\s+\w+)?|sem\s+\w+)\.?$/

/** "1.200" → 1200; "7,5" → 7.5; "12" → 12. NaN se não for número. */
export function paraNumero(v: unknown) {
  let s = String(v).trim().replace(/\.$/, '')
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN
  return Number(s)
}

/** Lê um número de um campo; zero ≠ vazio ≠ não lido. */
export function lerNumero(valor: unknown, padroes: RegExp[] = []): Leitura {
  if (valor === '' || valor === null || valor === undefined) return { valor: '', estado: 'vazio' }
  if (typeof valor === 'number') return { valor, estado: 'informado' }
  const limpo = String(valor).trim()
  if (!limpo) return { valor: '', estado: 'vazio' }
  const direto = paraNumero(limpo)
  if (!isNaN(direto)) return { valor: direto, estado: 'informado' }
  const texto = semAcento(limpo).toLowerCase()
  if (ZERO_EM_TEXTO.test(texto)) return { valor: 0, estado: 'informado' }
  for (const re of padroes) {
    const achado = texto.match(re)
    if (achado) {
      const n = paraNumero(achado[1])
      if (!isNaN(n) && n < 1000000) return { valor: n, estado: 'informado' }
    }
  }
  return { valor: '', estado: 'não lido' }
}

/** Campos secundários (média, participantes): se a escola escreveu só um número, ele é o total, não a média. */
export function lerNumeroSecundario(valor: unknown, padroes: RegExp[]): Leitura {
  if (typeof valor === 'number') return { valor: '', estado: 'vazio' }
  if (!isNaN(paraNumero(String(valor ?? '')))) return { valor: '', estado: 'vazio' }
  const r = lerNumero(valor, padroes)
  return r.estado === 'não lido' ? { valor: '', estado: 'vazio' } : r
}

const FAIXAS_USO: [string, RegExp][] = [
  ['Mais de 75%', /mais\s+de\s+75/],
  ['51% a 75%', /51\s*%?\s*a\s*75/],
  ['25% a 50%', /25\s*%?\s*a\s*50/],
  ['Menos de 25%', /menos\s+de\s+25/],
]

export function faixaDeUso(texto: unknown) {
  const t = semAcento(texto).toLowerCase()
  return FAIXAS_USO.find(([, re]) => re.test(t))?.[0] ?? ''
}

// Mês de referência
const NOMES_MES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const ROTULOS_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export const dois = (n: number | string) => ('0' + n).slice(-2)

/** Formata uma data no fuso de São Paulo ("yyyy-MM", "dd/MM/yyyy HH:mm"...). */
export function formatarData(d: Date, padrao: string) {
  const p: Record<string, string> = {}
  new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).forEach(x => { p[x.type] = x.value })
  return padrao.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute).replace('ss', p.second)
}

export const ehMesIso = (v: unknown) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(v))

/**
 * "Agosto", "ago/2026", "08/2026", "2026-08" ou uma data → "2026-08". '' se não reconhecer.
 * Sem ano no texto, usa o ano do envio; mês citado posterior ao do envio é do ano anterior.
 * A data de envio nunca substitui o mês informado: só completa o ano.
 */
export function mesReferencia(valor: unknown, dataEnvio?: Date | null) {
  if (valor instanceof Date) return formatarData(valor, 'yyyy-MM')
  const t = semAcento(valor).toLowerCase().trim()
  if (!t) return ''
  let m: RegExpMatchArray | null
  if ((m = t.match(/^(20\d{2})-(\d{1,2})$/)) && +m[2] >= 1 && +m[2] <= 12) return m[1] + '-' + dois(m[2])
  if ((m = t.match(/^(\d{1,2})\s*[/\-.]\s*(20\d{2})$/)) && +m[1] >= 1 && +m[1] <= 12) return m[2] + '-' + dois(m[1])
  if ((m = t.match(/^(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(20\d{2})$/)) && +m[2] >= 1 && +m[2] <= 12) return m[3] + '-' + dois(m[2])

  const achados = NOMES_MES.map((n, i) => (new RegExp('\\b' + n.slice(0, 3)).test(t) ? i : -1)).filter(i => i >= 0)
  if (achados.length !== 1) return '' // nenhum ou mais de um mês citado: ambíguo
  const indice = achados[0]
  const anoTexto = t.match(/\b(20\d{2})\b/)?.[1]
  if (anoTexto) return anoTexto + '-' + dois(indice + 1)
  if (!(dataEnvio instanceof Date)) return ''
  let ano = +formatarData(dataEnvio, 'yyyy')
  if (indice + 1 > +formatarData(dataEnvio, 'MM')) ano -= 1
  return ano + '-' + dois(indice + 1)
}

export function rotuloMes(iso: string) {
  const m = String(iso).match(/^(\d{4})-(\d{2})$/)
  return m ? ROTULOS_MES[+m[2] - 1] + '/' + m[1] : String(iso)
}

export function mesesEntre(isoA: string, isoB: string) {
  const a = String(isoA).split('-'), b = String(isoB).split('-')
  return (+b[0] - +a[0]) * 12 + (+b[1] - +a[1])
}

/** FNV-1a 32 bits: detecta mudança de conteúdo e gera IDs determinísticos. */
export function hashCurto(texto: unknown) {
  let h = 0x811c9dc5
  const s = String(texto)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return ('0000000' + h.toString(16)).slice(-8)
}
