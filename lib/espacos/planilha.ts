// Espaços de Leitura · respostas lidas da planilha ligada ao Google Forms.
// Alternativa ao script do Forms: quem é dona do formulário só compartilha a planilha de respostas com a
// conta de serviço do Presente, e a Central lê a planilha de hora em hora (app/api/espacos/planilha).
// Cada linha vira o mesmo envio { titulos, valores, referencia } que o script manda, e segue o mesmo caminho.

/** Link da planilha (ou só o código dela) → código da planilha. null se não for uma planilha do Google. */
export function idDaPlanilha(linkOuId: string): string | null {
  const s = linkOuId.trim()
  const doLink = s.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/)
  if (doLink) return doLink[1]
  return /^[\w-]{10,}$/.test(s) ? s : null
}

// diferença entre a hora local do fuso e o UTC, no instante dado
function deslocamento(fuso: string, ms: number) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms))
  const p = (t: string) => Number(partes.find(x => x.type === t)!.value)
  return Date.UTC(p('year'), p('month') - 1, p('day'), p('hour'), p('minute'), p('second')) - ms
}

/** Data da planilha (dias desde 30/12/1899, na hora local do fuso da planilha) → Date. */
export function dataDaPlanilha(valor: unknown, fuso: string): Date | null {
  if (typeof valor !== 'number' || !isFinite(valor)) return null
  const comoUtc = Math.round(Date.UTC(1899, 11, 30) + valor * 86_400_000)
  const segundo = Math.round(comoUtc / 1000) * 1000 // a planilha guarda frações; o Forms registra até o segundo
  return new Date(segundo - deslocamento(fuso, segundo))
}

const vazio = (v: unknown) => v === null || v === undefined || String(v).trim() === ''

/** Linhas da planilha (a primeira é o cabeçalho com as perguntas) → envios, como os do script do Forms. */
export function enviosDaPlanilha(linhas: unknown[][], fuso: string) {
  const [cabecalho = [], ...resto] = linhas
  const titulos = cabecalho.map(t => String(t ?? ''))
  const colunaCarimbo = titulos.findIndex(t => /^carimbo/i.test(t.trim()))
  return resto.flatMap((linha, i) => {
    if (!linha || linha.every(vazio)) return []
    const valores = titulos.map((_, c) => {
      const v = linha[c]
      if (c === colunaCarimbo) return dataDaPlanilha(v, fuso)?.toISOString() ?? String(v ?? '')
      return vazio(v) ? '' : String(v)
    })
    return [{ titulos, valores, referencia: `planilha linha ${i + 2}` }]
  })
}
