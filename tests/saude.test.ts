// Saúde do sistema: verificações de hora em hora, achados abertos e resolvidos sozinhos, números da tela.
import { describe, expect, it } from 'vitest'
import { verificar, planoDeAchados, resumoDasRodadas, type Dados } from '@/lib/saude'

const agora = new Date('2026-11-23T12:00:00Z') // 09:00 em Brasília
const lista = (o: Partial<Dados['listas'][number]> = {}) => ({
  id: 'l1', title: 'Formação Cantos de Leitura', date: '2026-11-20', start_time: '14:00', end_time: '16:00',
  state: 'auto' as const, keep_open_hours: null, open_until: null, pdf_sent_at: '2026-11-21T10:00:00Z' as string | null, ...o,
})
const base = (o: Partial<Dados> = {}): Dados => ({
  agora,
  banco: { ok: true, ms: 120 },
  rodadaAnterior: '2026-11-23T11:00:00Z',
  listas: [lista()],
  espacos: { planilhaConfigurada: true, ultimaResposta: '2026-11-20T15:00:00Z', revisao: 0, pendentesMes: 0, mes: '2026-10' },
  ultimaAvaliacao: '2026-11-22T18:00:00Z',
  ultimoBackup: '2026-11-20T20:00:00Z',
  ...o,
})
const por = (d: Dados) => Object.fromEntries(verificar(d).map(v => [v.chave, v]))

describe('Saúde do sistema · verificações', () => {
  it('tudo em dia: todas as verificações ok, nenhum achado', () => {
    const vs = verificar(base())
    expect(vs.every(v => v.status === 'ok')).toBe(true)
    expect(vs.some(v => v.achado)).toBe(false)
    expect(por(base()).banco.valor).toBe('120 ms')
  })

  it('banco fora do ar é falha urgente', () => {
    const v = por(base({ banco: { ok: false, ms: null } })).banco
    expect(v.status).toBe('falha')
    expect(v.achado?.gravidade).toBe('P1')
  })

  it('tarefa automática parada há mais de 2 horas pede atenção', () => {
    expect(por(base({ rodadaAnterior: '2026-11-23T08:30:00Z' })).tarefa.status).toBe('atencao')
    expect(por(base({ rodadaAnterior: null })).tarefa.status).toBe('ok') // primeira conferência
  })

  it('lista aberta à mão há mais de 7 dias e documento esquecido viram achados', () => {
    const d = base({ listas: [
      lista({ id: 'a', title: 'Formação antiga', date: '2026-11-02', state: 'open' }),
      lista({ id: 'b', date: '2026-11-10', pdf_sent_at: null }),
      lista({ id: 'c', date: '2026-11-21', pdf_sent_at: null }), // encerrou há menos de 7 dias: ainda no prazo
    ] })
    const v = por(d)
    expect(v.listas_abertas.status).toBe('atencao')
    expect(v.listas_abertas.achado?.titulo).toContain('Formação antiga')
    expect(v.documentos.status).toBe('atencao')
    expect(v.documentos.valor).toBe('1 lista')
  })

  it('formulário do Espaços sem planilha e sem resposta há mais de 30 dias pede para ligar a planilha', () => {
    const v = por(base({ espacos: { planilhaConfigurada: false, ultimaResposta: '2026-09-25T18:00:00Z', revisao: 2, pendentesMes: 14, mes: '2026-10' } }))
    expect(v.formulario.status).toBe('atencao')
    expect(v.formulario.achado?.acao).toContain('assistente -- google')
    expect(v.revisao.status).toBe('atencao')
    expect(v.revisao.valor).toBe('2 respostas')
    expect(v.pendentes.valor).toBe('14 escolas')
  })

  it('backup: sem registro ou com mais de 7 dias pede atenção; mais de 14 dias é falha', () => {
    expect(por(base({ ultimoBackup: null })).backup.status).toBe('atencao')
    expect(por(base({ ultimoBackup: '2026-11-14T12:00:00Z' })).backup.status).toBe('atencao')
    const v = por(base({ ultimoBackup: '2026-11-01T12:00:00Z' })).backup
    expect(v.status).toBe('falha')
    expect(v.achado?.gravidade).toBe('P1')
  })
})

describe('Saúde do sistema · achados', () => {
  it('abre achado para verificação com problema e resolve sozinho quando ela volta ao normal', () => {
    const comProblema = verificar(base({ ultimoBackup: null }))
    const p1 = planoDeAchados(comProblema, [])
    expect(p1.abrir.map(a => a.id)).toEqual(['ACH-backup'])
    expect(p1.resolver).toEqual([])

    const abertos = [{ id: 'ACH-backup', estado: 'aberto', origem: 'verificacao', verificacao: 'backup' }]
    expect(planoDeAchados(comProblema, abertos).abrir).toEqual([]) // já aberto: não duplica
    expect(planoDeAchados(verificar(base()), abertos).resolver).toEqual(['ACH-backup'])
  })

  it('não reabre o que a Equipe ignorou e não mexe nos achados do agente', () => {
    const comProblema = verificar(base({ ultimoBackup: null }))
    expect(planoDeAchados(comProblema, [{ id: 'ACH-backup', estado: 'ignorado', origem: 'verificacao', verificacao: 'backup' }]).abrir).toEqual([])
    const doAgente = [{ id: 'ACH-1123-01', estado: 'aguarda_voce', origem: 'agente', verificacao: null }]
    expect(planoDeAchados(verificar(base()), doAgente).resolver).toEqual([])
  })
})

describe('Saúde do sistema · números da tela', () => {
  it('no ar = conferências com banco ok; problemas por dia = maior número de verificações com problema no dia', () => {
    const r = (quando: string, banco: string, outros = 0) => ({
      quando, resultado: [{ chave: 'banco', status: banco }, ...Array.from({ length: outros }, (_, i) => ({ chave: 'x' + i, status: 'atencao' }))],
    })
    const s = resumoDasRodadas([
      r('2026-11-22T10:00:00Z', 'ok', 1), r('2026-11-22T11:00:00Z', 'falha', 2),
      r('2026-11-23T10:00:00Z', 'ok'), r('2026-11-23T11:00:00Z', 'ok'),
    ], agora)
    expect(s.noAr).toBeCloseTo(0.75)
    expect(s.porDia).toHaveLength(30)
    expect(s.porDia.at(-1)).toEqual({ dia: '2026-11-23', problemas: 0 })
    expect(s.porDia.at(-2)).toEqual({ dia: '2026-11-22', problemas: 3 })
    expect(s.porDia.at(-3)).toEqual({ dia: '2026-11-21', problemas: null }) // sem conferência nesse dia
  })
})
