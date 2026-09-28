import { cpfValid, onlyDigits } from './format'

// Regras da Presença enviada pelo Voluntário no formulário público.

export type CampoPresenca = 'name' | 'role' | 'cpf' | 'signature' | 'consent'
export type EntradaPresenca = { name?: unknown; role?: unknown; cpf?: unknown; signature?: unknown; consent?: unknown }
export type Presenca = { name: string; role: string; cpf: string; signature: string }

// Uma assinatura real (PNG de 600 px de largura) tem ~20–40 KB.
const MAX_ASSINATURA = 150_000

export function validarPresenca(e: EntradaPresenca):
  | { ok: true; presenca: Presenca }
  | { ok: false; errors: Partial<Record<CampoPresenca, string>> } {
  const name = String(e.name ?? '').trim().replace(/\s+/g, ' ')
  const role = String(e.role ?? '').trim()
  const cpf = onlyDigits(String(e.cpf ?? ''))
  const signature = String(e.signature ?? '')
  const errors: Partial<Record<CampoPresenca, string>> = {}

  if (name.split(' ').length < 2 || name.length > 120) errors.name = 'Informe nome e sobrenome.'
  else if (!/^\p{L}[\p{L}'’. -]*$/u.test(name)) errors.name = 'Use só letras no nome.'
  if (!role || role.length > 80) errors.role = 'Informe seu cargo ou função no projeto.'
  else if (!/^[\p{L}\p{N}][\p{L}\p{N}()/'’., -]*$/u.test(role)) errors.role = 'Use só letras e números no cargo.'
  if (!cpfValid(cpf)) errors.cpf = 'CPF inválido — confira os 11 dígitos.'
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > MAX_ASSINATURA)
    errors.signature = 'Faça sua assinatura no quadro acima.'
  if (e.consent !== true) errors.consent = 'Marque a confirmação para continuar.'

  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, presenca: { name, role, cpf, signature } }
}

// Nenhuma Lista de Presença aceita mais que o dobro dos Participantes previstos (folga mínima de 20).
export const limiteDePresencas = (previstos: number) => Math.max(previstos * 2, previstos + 20)
