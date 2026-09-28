import { describe, expect, it } from 'vitest'
import { validarCapacitacao } from '@/lib/capacitacao'

const valida = {
  project_id: 'p1', title: '  Mediação de leitura ', date: '2026-10-08', start_time: '14:00', end_time: '16:00',
  instructor: ' Maria ', beneficiary_name: ' E.E. Maria das Dores ', beneficiary_cnpj: '11.222.333/0001-81',
  city: 'Recife – PE', expected_count: '25',
}

describe('Capacitação criada ou corrigida pela Equipe', () => {
  it('aceita os dados completos e normaliza textos, CNPJ e participantes', () => {
    expect(validarCapacitacao(valida)).toEqual({
      ok: true,
      capacitacao: {
        project_id: 'p1', title: 'Mediação de leitura', date: '2026-10-08', start_time: '14:00', end_time: '16:00',
        instructor: 'Maria', beneficiary_name: 'E.E. Maria das Dores', beneficiary_cnpj: '11222333000181',
        city: 'Recife – PE', expected_count: 25, keep_open_hours: null,
      },
    })
  })

  it('lista estendida aceita só 48 horas, 72 horas ou 7 dias', () => {
    const r = validarCapacitacao({ ...valida, keep_open_hours: '48' })
    expect(r.ok && r.capacitacao.keep_open_hours).toBe(48)
    expect(validarCapacitacao({ ...valida, keep_open_hours: '5000' })).toMatchObject({ ok: false, field: 'keep_open_hours' })
  })

  it('Instrutor é opcional', () => {
    const r = validarCapacitacao({ ...valida, instructor: '  ' })
    expect(r.ok && r.capacitacao.instructor).toBeNull()
  })

  it('aponta o campo com problema', () => {
    expect(validarCapacitacao({ ...valida, title: '' })).toMatchObject({ ok: false, field: 'title' })
    expect(validarCapacitacao({ ...valida, date: '08/10/2026' })).toMatchObject({ ok: false, field: 'date' })
    expect(validarCapacitacao({ ...valida, beneficiary_name: '' })).toMatchObject({ ok: false, field: 'beneficiary_name' })
    expect(validarCapacitacao({ ...valida, beneficiary_cnpj: '11.222.333/0001-82' })).toMatchObject({ ok: false, field: 'beneficiary_cnpj' })
    expect(validarCapacitacao({ ...valida, city: '' })).toMatchObject({ ok: false, field: 'city' })
    expect(validarCapacitacao({ ...valida, expected_count: '0' })).toMatchObject({ ok: false, field: 'expected_count' })
  })

  it('o término precisa ser depois do início', () => {
    expect(validarCapacitacao({ ...valida, start_time: '16:00', end_time: '14:00' })).toMatchObject({ ok: false, field: 'end_time' })
    expect(validarCapacitacao({ ...valida, start_time: '14:00', end_time: '14:00' })).toMatchObject({ ok: false, field: 'end_time' })
  })

  it('exige o Projeto', () => {
    expect(validarCapacitacao({ ...valida, project_id: '' })).toMatchObject({ ok: false, field: 'project_id' })
  })
})
