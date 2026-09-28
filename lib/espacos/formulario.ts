// Espaços de Leitura · o envio que o script do Google Forms manda ao hub.
import { CAMPOS_ORIGINAIS, type Registro } from './regras'

const MAX_CAMPOS = 100
const MAX_TEXTO = 50_000

/** Confere o formato do corpo recebido: { titulos: string[], valores: [], referencia? }. */
export function lerEnvio(corpo: unknown):
  | { ok: true; titulos: string[]; valores: unknown[]; referencia: string }
  | { ok: false; erro: string } {
  const c = corpo as { titulos?: unknown; valores?: unknown; referencia?: unknown } | null
  if (!c || !Array.isArray(c.titulos) || !Array.isArray(c.valores)) return { ok: false, erro: 'envie { titulos: [...], valores: [...] }' }
  if (c.titulos.length !== c.valores.length) return { ok: false, erro: 'títulos e valores com tamanhos diferentes' }
  if (c.titulos.length > MAX_CAMPOS) return { ok: false, erro: 'campos demais' }
  if (!c.titulos.every(t => typeof t === 'string')) return { ok: false, erro: 'títulos precisam ser texto' }
  if (c.valores.some(v => String(v ?? '').length > MAX_TEXTO)) return { ok: false, erro: 'resposta grande demais' }
  return { ok: true, titulos: c.titulos, valores: c.valores.map(v => (v === null || v === undefined ? '' : String(v))), referencia: String(c.referencia ?? '').slice(0, 200) }
}

/** Resposta montada por respostaDoFormulario → linha de el_respostas, só com o conteúdo original. */
export function linhaDaResposta(r: Registro) {
  const linha: Registro = {
    id: r.resposta_id,
    origem: r.origem,
    referencia_origem: r.referencia_origem,
    hash_origem: r.hash_origem,
  }
  for (const campo of CAMPOS_ORIGINAIS) linha[campo] = campo === 'carimbo' ? (r.carimbo instanceof Date ? r.carimbo.toISOString() : null) : String(r[campo] ?? '')
  return linha
}
