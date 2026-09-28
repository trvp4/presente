import { onlyDigits } from './format'

// Regras do Projeto cadastrado pela Equipe (mesmas no cadastro e na edição).
export function validarProjeto(e: { name?: unknown; pronac?: unknown }):
  | { ok: true; projeto: { name: string; pronac: string } }
  | { ok: false; error: string } {
  const name = String(e.name ?? '').trim()
  const pronac = onlyDigits(String(e.pronac ?? ''))
  if (!name) return { ok: false, error: 'Informe o nome do projeto.' }
  if (!/^\d{5,7}$/.test(pronac)) return { ok: false, error: 'O Pronac deve ter de 5 a 7 números.' }
  return { ok: true, projeto: { name, pronac } }
}
