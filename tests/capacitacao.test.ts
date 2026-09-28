import { describe, expect, it } from 'vitest'
import { abertaAte, encerrar, prazoNaCorrecao, reabrir, validarCapacitacao } from '@/lib/capacitacao'
import { statusOf } from '@/lib/format'

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

describe('Lista criada depois do encontro', () => {
  const agora = new Date('2026-09-28T15:00:00-03:00')
  const lista = (date: string, keep_open_hours: number | null = null) => ({ date, start_time: '15:30', end_time: '17:30', keep_open_hours })

  it('encontro que já passou: recebe assinaturas por 48 h a partir da criação, ou pelo prazo escolhido', () => {
    expect(abertaAte(lista('2026-08-07'), agora)).toBe('2026-09-30T18:00:00.000Z')
    expect(abertaAte(lista('2026-08-07', 168), agora)).toBe('2026-10-05T18:00:00.000Z')
  })

  it('encontro de hoje, futuro ou ainda dentro da janela: segue o horário, sem prazo extra', () => {
    expect(abertaAte(lista('2026-10-06'), agora)).toBeNull()
    expect(abertaAte(lista('2026-09-28'), agora)).toBeNull()
    expect(abertaAte(lista('2026-09-27', 48), agora)).toBeNull() // lista estendida ainda aberta
    expect(abertaAte({ date: '2026-09-28', start_time: '12:00', end_time: '14:00', keep_open_hours: null }, agora)).toBeNull() // fecha às 15:00: ainda dentro
    expect(abertaAte({ date: '2026-09-28', start_time: '11:59', end_time: '13:59', keep_open_hours: null }, agora)).not.toBeNull() // fechou às 14:59
  })

  it('a lista aceita assinaturas até o prazo e fecha sozinha depois', () => {
    const t = { ...lista('2026-08-07'), state: 'auto' as const, open_until: '2026-09-30T18:00:00.000Z' }
    expect(statusOf(t, new Date('2026-09-30T14:59:00-03:00'))).toBe('live')
    expect(statusOf(t, new Date('2026-09-30T15:01:00-03:00'))).toBe('done')
    expect(statusOf({ ...t, state: 'closed' }, agora)).toBe('done') // encerrar à mão continua valendo
  })

  it('corrigir a data para um encontro futuro tira o prazo; para uma data passada, não mexe', () => {
    expect(prazoNaCorrecao(lista('2026-10-06'), agora)).toEqual({ open_until: null })
    expect(prazoNaCorrecao(lista('2026-08-07'), agora)).toEqual({})
  })
})

describe('Chave "Aceitando presenças"', () => {
  const agora = new Date('2026-09-28T15:00:00-03:00')
  const antiga = { date: '2026-09-25', start_time: '10:30', end_time: '12:30', keep_open_hours: null }

  it('ligar reabre por 48 h a partir de agora; depois a lista fecha sozinha', () => {
    const r = reabrir(agora)
    expect(r).toEqual({ state: 'auto', open_until: '2026-09-30T18:00:00.000Z' })
    expect(statusOf({ ...antiga, ...r }, new Date('2026-09-30T14:59:00-03:00'))).toBe('live')
    expect(statusOf({ ...antiga, ...r }, new Date('2026-09-30T15:01:00-03:00'))).toBe('done')
  })

  it('desligar encerra na hora e tira o prazo', () => {
    expect(encerrar()).toEqual({ state: 'closed', open_until: null })
    expect(statusOf({ ...antiga, ...reabrir(agora), ...encerrar() }, agora)).toBe('done')
  })
})
