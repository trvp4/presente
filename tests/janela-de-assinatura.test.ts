import { describe, expect, it } from 'vitest'
import { janelaTexto, statusOf } from '@/lib/format'

// Capacitação de 24/09/2026, das 14:00 às 16:00 (horário de Brasília)
const capacitacao = { date: '2026-09-24', start_time: '14:00:00', end_time: '16:00:00', state: 'auto' as const, keep_open_hours: null, open_until: null }
const em = (hora: string) => new Date(`2026-09-24T${hora}:00-03:00`)

describe('Janela de Assinatura', () => {
  it('ainda não abriu até 30 minutos antes do início', () => {
    expect(statusOf(capacitacao, em('13:29'))).toBe('sched')
  })

  it('abre 30 minutos antes do início', () => {
    expect(statusOf(capacitacao, em('13:30'))).toBe('live')
  })

  it('continua aberta até 1 hora depois do término', () => {
    expect(statusOf(capacitacao, em('17:00'))).toBe('live')
  })

  it('encerra passada 1 hora do término', () => {
    expect(statusOf(capacitacao, em('17:01'))).toBe('done')
  })

  it('abertura manual aceita presenças fora do horário', () => {
    expect(statusOf({ ...capacitacao, state: 'open' }, new Date('2026-10-01T08:00:00-03:00'))).toBe('live')
  })

  it('encerramento manual fecha a lista mesmo dentro da janela', () => {
    expect(statusOf({ ...capacitacao, state: 'closed' }, em('14:30'))).toBe('done')
  })

  it('lista estendida fica aberta 48 horas a partir do início, para quem só vê o material à noite', () => {
    const estendida = { ...capacitacao, keep_open_hours: 48 }
    expect(statusOf(estendida, new Date('2026-09-25T22:00:00-03:00'))).toBe('live')
    expect(statusOf(estendida, new Date('2026-09-26T14:00:00-03:00'))).toBe('live')
    expect(statusOf(estendida, new Date('2026-09-26T14:01:00-03:00'))).toBe('done')
    expect(statusOf(estendida, em('13:29'))).toBe('sched') // continua abrindo 30 min antes
  })

  it('encerramento manual também fecha a lista estendida', () => {
    expect(statusOf({ ...capacitacao, keep_open_hours: 48, state: 'closed' }, new Date('2026-09-25T10:00:00-03:00'))).toBe('done')
  })

  it('o texto da janela mostra até quando a lista estendida aceita assinaturas', () => {
    expect(janelaTexto('2026-09-24', '14:00', '16:00', 48)).toContain('das 13:30 do dia 24/09 até as 14:00 do dia 26/09')
    expect(janelaTexto('2026-09-24', '14:00', '16:00', null)).toContain('das 13:30 às 17:00 do dia 24/09')
  })
})
