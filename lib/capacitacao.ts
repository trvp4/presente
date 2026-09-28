import { JANELAS_ESTENDIDAS, cnpjValid, onlyDigits } from './format'

// Regras da Capacitação (mesmas ao criar e ao corrigir a lista).

export type DadosCapacitacao = {
  project_id: string
  title: string
  date: string
  start_time: string
  end_time: string
  instructor: string | null
  beneficiary_name: string
  beneficiary_cnpj: string
  city: string
  expected_count: number
  keep_open_hours: number | null
}

type Entrada = Partial<Record<keyof DadosCapacitacao, unknown>>

export function validarCapacitacao(e: Entrada):
  | { ok: true; capacitacao: DadosCapacitacao }
  | { ok: false; field: keyof DadosCapacitacao; error: string } {
  const txt = (v: unknown) => String(v ?? '').trim()
  const c: DadosCapacitacao = {
    project_id: txt(e.project_id),
    title: txt(e.title),
    date: txt(e.date),
    start_time: txt(e.start_time),
    end_time: txt(e.end_time),
    instructor: txt(e.instructor) || null,
    beneficiary_name: txt(e.beneficiary_name),
    beneficiary_cnpj: onlyDigits(txt(e.beneficiary_cnpj)),
    city: txt(e.city),
    expected_count: Number(txt(e.expected_count)),
    keep_open_hours: txt(e.keep_open_hours) ? Number(txt(e.keep_open_hours)) : null,
  }
  const falha = (field: keyof DadosCapacitacao, error: string) => ({ ok: false as const, field, error })

  if (!c.project_id) return falha('project_id', 'Escolha o projeto.')
  if (!c.title) return falha('title', 'Informe o tema para identificar a lista.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date)) return falha('date', 'Informe a data do encontro.')
  if (!/^\d{2}:\d{2}/.test(c.start_time) || !/^\d{2}:\d{2}/.test(c.end_time) || c.end_time <= c.start_time)
    return falha('end_time', 'O término precisa ser depois do início.')
  if (!c.beneficiary_name) return falha('beneficiary_name', 'Informe a escola / instituição beneficiada.')
  if (!cnpjValid(c.beneficiary_cnpj)) return falha('beneficiary_cnpj', 'CNPJ inválido — confira os 14 dígitos.')
  if (!c.city) return falha('city', 'Informe a cidade.')
  if (!Number.isInteger(c.expected_count) || c.expected_count < 1) return falha('expected_count', 'Informe quantos participantes são esperados.')
  if (c.keep_open_hours !== null && !(JANELAS_ESTENDIDAS as readonly number[]).includes(c.keep_open_hours)) return falha('keep_open_hours', 'Escolha por quanto tempo a lista fica aberta.')
  return { ok: true, capacitacao: c }
}
