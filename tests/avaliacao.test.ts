import { describe, expect, it } from 'vitest'
import { linhaDaAvaliacao, resumir, type Avaliacao } from '@/lib/avaliacao'

const TITULOS = ['Carimbo de data/hora', 'Endereço de e-mail', 'Em qual projeto foi realizada a capacitação?',
  '1. Como você classificaria sua satisfação geral com a formação?', '8. O que você mais gostou na formação?', '11. Você recomendaria esta formação a outros professores?']

const av = (projeto: string, satisf: string, gostou: string, rec: string, quando = '2026-09-10T12:00:00.000Z'): Avaliacao =>
  linhaDaAvaliacao(TITULOS, [quando, 'prof@escola.br', projeto, satisf, gostou, rec], '')!

describe('Avaliação da formação', () => {
  it('guarda projeto e respostas, mas não o e-mail', () => {
    const l = linhaDaAvaliacao(TITULOS, ['2026-09-10T12:00:00.000Z', 'prof@escola.br', 'Cantos de Leitura 2026', 'Satisfeito', 'As dinâmicas', 'Sim'], 'resp-1')!
    expect(l).toMatchObject({ id: 'resp-1', projeto: 'Cantos de Leitura 2026', carimbo: '2026-09-10T12:00:00.000Z' })
    expect(JSON.stringify(l)).not.toContain('prof@escola.br')
    expect(linhaDaAvaliacao(['Carimbo de data/hora', '1. Satisfação'], ['', 'Sim'], 'x')).toBeNull() // sem pergunta do projeto
  })

  it('conta escalas na ordem pior → melhor e separa as perguntas abertas', () => {
    const r = resumir([
      av('A', 'Muito Satisfeito', 'Tudo', 'Sim', '2026-09-01T12:00:00Z'),
      av('A', 'Insatisfeito', 'Pouco', 'Talvez', '2026-09-03T12:00:00Z'),
      av('B', 'Satisfeito', 'As dinâmicas', 'Sim', '2026-09-02T12:00:00Z'),
      av('B', 'satisfeito', '', 'Não'),
    ])
    const satisf = r.perguntas[0]
    expect(satisf.tipo === 'escala' && satisf.opcoes.map(o => [o.rotulo, o.n, o.tom])).toEqual([
      ['Insatisfeito', 1, 'neg'], ['Satisfeito', 2, 'pos'], ['Muito Satisfeito', 1, 'pos'],
    ])
    expect(r.satisfacao).toBe(0.75)
    expect(r.recomendaria).toBe(0.5)
    const aberta = r.perguntas[1]
    expect(aberta.tipo === 'texto' && aberta.textos.map(t => t.texto)).toEqual(['Pouco', 'As dinâmicas', 'Tudo']) // mais recentes primeiro, vazias fora
  })
})
