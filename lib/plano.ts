// Plano de capacitações: o que está previsto (planilha "Capacitações 2026") e a ligação com as
// Listas de Presença. Um item ligado a uma lista encerrada com presenças conta como realizado.
import type { Status } from './format'

export type ItemPlano = {
  id: string; project_id: string; school_id: string | null; training_id: string | null
  patrocinador: string | null; tipo: string; modo: string | null; publico: string | null; cidade: string | null
  data_prevista: string | null; hora: string | null; data_realizada: string | null
  situacao: 'planejada' | 'realizada' | 'cancelada'; observacoes: string | null
}
export type ListaLigada = { id: string; school_id: string | null; status: Status; presencas: number; date: string }

export type Grupo = 'realizada-sem-lista' | 'com-data' | 'sem-data' | 'com-lista' | 'cancelada'
export const GRUPOS: { id: Grupo; titulo: string; texto: string }[] = [
  { id: 'realizada-sem-lista', titulo: 'Realizadas sem lista', texto: 'Aconteceram, mas não têm Lista de Presença no sistema.' },
  { id: 'com-data', titulo: 'Com data', texto: 'Crie a lista para ter o link e o QR code no dia.' },
  { id: 'sem-data', titulo: 'Sem data', texto: 'Ainda falta combinar a data com a escola.' },
  { id: 'com-lista', titulo: 'Com lista', texto: 'Já têm Lista de Presença; a presença assinada confirma a participação da escola.' },
  { id: 'cancelada', titulo: 'Canceladas', texto: '' },
]

export function grupoDoItem(i: Pick<ItemPlano, 'situacao' | 'training_id' | 'data_prevista'>): Grupo {
  if (i.situacao === 'cancelada') return 'cancelada'
  if (i.training_id) return 'com-lista'
  if (i.situacao === 'realizada') return 'realizada-sem-lista'
  return i.data_prevista ? 'com-data' : 'sem-data'
}

/** Participação da escola: confirmada quando a lista ligada tem presença assinada. */
export function participacao(lista: ListaLigada | undefined) {
  if (!lista) return 'a confirmar' as const
  if (lista.presencas > 0) return 'confirmada' as const
  return lista.status === 'done' ? ('sem presenças' as const) : ('a confirmar' as const)
}

/** Lista do Presente que parece ser deste item: a única lista ainda sem item, da mesma escola. */
export function sugestaoDeLista(i: Pick<ItemPlano, 'school_id' | 'training_id'>, listas: ListaLigada[], ligadas: Set<string>) {
  if (i.training_id || !i.school_id) return null
  const candidatas = listas.filter(l => l.school_id === i.school_id && !ligadas.has(l.id))
  return candidatas.length === 1 ? candidatas[0] : null
}

// ---------------- leitura da planilha (carga) ----------------
/** "15h00", "15h", "15:30" → "15:00" / "15:30"; o que não for hora vira null. */
export function lerHora(v: string | null | undefined) {
  const m = String(v ?? '').trim().match(/^(\d{1,2})\s*[h:]\s*(\d{2})?$/i)
  if (!m || +m[1] > 23 || (m[2] && +m[2] > 59)) return null
  return `${m[1].padStart(2, '0')}:${m[2] ?? '00'}`
}

/** Observação da carga "cidade: Jacareí · instituição a definir" → cidade e o resto da observação. */
export function lerObservacoes(obs: string | null | undefined) {
  const partes = String(obs ?? '').split('·').map(s => s.trim()).filter(Boolean)
  const cidade = partes.find(p => /^cidade:/i.test(p))?.replace(/^cidade:\s*/i, '') || null
  const resto = partes.filter(p => !/^cidade:/i.test(p)).join(' · ') || null
  return { cidade: cidade && !/^a definir/i.test(cidade) ? cidade : null, observacoes: resto && cidade && /^a definir/i.test(cidade) ? `cidade ${cidade.toLowerCase()} · ${resto}` : resto }
}
