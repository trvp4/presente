import { describe, expect, it } from 'vitest'
import { PADROES, chaveEscola, lerNumero, lerNumeroSecundario, mesReferencia } from '@/lib/espacos/normalizacao'
import { mapearPerguntas } from '@/lib/espacos/regras'

describe('Espaços de Leitura · normalização', () => {
  it('mesma escola escrita de formas diferentes gera a mesma chave', () => {
    expect(chaveEscola('E.M. Profª Ana Neri')).toBe(chaveEscola('Escola Municipal Professora Ana Neri'))
    expect(chaveEscola('EMEF  João Alves ')).toBe(chaveEscola('E.M.E.F João Alves'))
    expect(chaveEscola('EMEF João Alves'), 'municipal e estadual são escolas diferentes').not.toBe(chaveEscola('EE João Alves'))
  })

  it('números: zero, vazio, ilegível e formatos brasileiros', () => {
    expect(lerNumero('', PADROES.visitas)).toEqual({ valor: '', estado: 'vazio' })
    expect(lerNumero('0', PADROES.visitas)).toEqual({ valor: 0, estado: 'informado' })
    expect(lerNumero('Nenhuma', PADROES.visitas)).toEqual({ valor: 0, estado: 'informado' })
    expect(lerNumero('1.200', PADROES.visitas)).toEqual({ valor: 1200, estado: 'informado' })
    expect(lerNumero('Total de visitas no mês: 340 Média diária: 17', PADROES.visitas)).toEqual({ valor: 340, estado: 'informado' })
    expect(lerNumero('muitas crianças visitaram', PADROES.visitas).estado).toBe('não lido')
    expect(lerNumero('300 visitas mensais e 50 visitas diárias', PADROES.visitas).valor).toBe(300)
    expect(lerNumero('600 por mês, em média 30 alunos por dia.', PADROES.visitas).valor).toBe(600)
    expect(lerNumero('15 atividades realizadas, de 20 a 25 alunos', PADROES.eventos).valor).toBe(15)
    expect(lerNumero('Atividades de leitura: 4 - Oficinas/clubes de leitura: 5 - Outros: 5', PADROES.eventos).estado,
      'só as partes, sem o total: não inventa soma').toBe('não lido')
    expect(lerNumeroSecundario('Total de visitas: 340 Média diária de visitas: 17,5', PADROES.mediaDiaria).valor).toBe(17.5)
    expect(lerNumeroSecundario('340', PADROES.mediaDiaria).valor, 'número sozinho é o total, não a média').toBe('')
  })

  it('mês de referência', () => {
    const set = new Date('2026-09-10T12:00:00-03:00')
    const jan = new Date('2027-01-05T12:00:00-03:00')
    expect(mesReferencia('Agosto', set)).toBe('2026-08')
    expect(mesReferencia('Dezembro', jan)).toBe('2026-12')
    expect(mesReferencia('ago/2025', set)).toBe('2025-08')
    expect(mesReferencia('08/2026', set)).toBe('2026-08')
    expect(mesReferencia('julho e agosto', set), 'dois meses citados é ambíguo').toBe('')
    expect(mesReferencia('', set)).toBe('')
  })

  it('perguntas do formulário: cada título casa com um único campo', () => {
    const titulos = ['Carimbo de data/hora', 'Endereço de e-mail', 'Qual o projeto recebido pela instituição?',
      'Qual a instituição recebeu o projeto?', 'Em que mês  é referente a resposta desse formulário?',
      'Responda de acordo com as atividades realizadas no espaço',
      'Houveram outras atividades realizadas no espaço além do seguimento do cronograma?']
    const m = mapearPerguntas(titulos).mapa
    expect(m.atividades_texto).toBe(5)
    expect(m.fora_cronograma).toBe(6)
    expect(m.email_respondente).toBe(1)
    expect(m.mes_informado).toBe(4)
  })
})
