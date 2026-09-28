import { describe, expect, it } from 'vitest'
import { grupoDoItem, lerHora, lerObservacoes, participacao, sugestaoDeLista, type ListaLigada } from '@/lib/plano'

const lista = (id: string, school_id: string | null, extra: Partial<ListaLigada> = {}): ListaLigada =>
  ({ id, school_id, status: 'sched', presencas: 0, date: '2026-09-29', ...extra })

describe('Plano de capacitações', () => {
  it('separa o que falta fazer: realizada sem lista, com data, sem data, com lista', () => {
    expect(grupoDoItem({ situacao: 'realizada', training_id: null, data_prevista: '2026-07-15' })).toBe('realizada-sem-lista')
    expect(grupoDoItem({ situacao: 'planejada', training_id: null, data_prevista: '2026-10-10' })).toBe('com-data')
    expect(grupoDoItem({ situacao: 'planejada', training_id: null, data_prevista: null })).toBe('sem-data')
    expect(grupoDoItem({ situacao: 'planejada', training_id: 't1', data_prevista: null })).toBe('com-lista')
    expect(grupoDoItem({ situacao: 'cancelada', training_id: 't1', data_prevista: null })).toBe('cancelada')
  })

  it('a presença assinada confirma a participação da escola', () => {
    expect(participacao(undefined)).toBe('a confirmar')
    expect(participacao(lista('t1', 's1', { presencas: 7, status: 'done' }))).toBe('confirmada')
    expect(participacao(lista('t1', 's1', { status: 'done' }))).toBe('sem presenças')
    expect(participacao(lista('t1', 's1'))).toBe('a confirmar')
  })

  it('sugere ligar a lista quando há exatamente uma lista livre da mesma escola', () => {
    const listas = [lista('t1', 's1'), lista('t2', 's2'), lista('t3', 's2')]
    expect(sugestaoDeLista({ school_id: 's1', training_id: null }, listas, new Set())?.id).toBe('t1')
    expect(sugestaoDeLista({ school_id: 's1', training_id: null }, listas, new Set(['t1']))).toBeNull() // já ligada a outro item
    expect(sugestaoDeLista({ school_id: 's2', training_id: null }, listas, new Set())).toBeNull() // ambígua
    expect(sugestaoDeLista({ school_id: null, training_id: null }, listas, new Set())).toBeNull()
  })

  it('lê a hora e a cidade como vieram da planilha', () => {
    expect(lerHora('15h00')).toBe('15:00')
    expect(lerHora('9h30')).toBe('09:30')
    expect(lerHora('14h')).toBe('14:00')
    expect(lerHora('à tarde')).toBeNull()
    expect(lerObservacoes('cidade: Jacareí · status original: Realizada')).toEqual({ cidade: 'Jacareí', observacoes: 'status original: Realizada' })
    expect(lerObservacoes('cidade: Gravataí · instituição a definir')).toEqual({ cidade: 'Gravataí', observacoes: 'instituição a definir' })
    expect(lerObservacoes('cidade: A definir AGRO · instituição a definir')).toEqual({ cidade: null, observacoes: 'cidade a definir agro · instituição a definir' })
  })
})
