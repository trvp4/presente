// Espaços de Leitura · respostas lidas da planilha ligada ao Google Forms (em vez do script do Forms).
import { describe, expect, it } from 'vitest'
import { idDaPlanilha, dataDaPlanilha, enviosDaPlanilha } from '@/lib/espacos/planilha'
import { mapearPerguntas, respostaDoFormulario } from '@/lib/espacos/regras'

describe('Espaços de Leitura · planilha do formulário', () => {
  it('aceita o link da planilha ou só o código dela', () => {
    expect(idDaPlanilha('https://docs.google.com/spreadsheets/d/1AbC_dEf-123/edit?usp=sharing#gid=0')).toBe('1AbC_dEf-123')
    expect(idDaPlanilha('  1AbC_dEf-123  ')).toBe('1AbC_dEf-123')
    expect(idDaPlanilha('https://docs.google.com/forms/d/1BvtLW7/edit')).toBeNull()
    expect(idDaPlanilha('')).toBeNull()
  })

  it('o carimbo da planilha (número de dias, no fuso da planilha) vira a hora certa', () => {
    // 22/10/2026 14:03:54 em São Paulo = 17:03:54 UTC
    const serial = 46317 + (14 * 3600 + 3 * 60 + 54) / 86400
    expect(dataDaPlanilha(serial, 'America/Sao_Paulo')!.toISOString()).toBe('2026-10-22T17:03:54.000Z')
    expect(dataDaPlanilha('', 'America/Sao_Paulo')).toBeNull()
  })

  it('cada linha preenchida vira um envio igual ao do script; linhas vazias são ignoradas', () => {
    const serial = 46317 + 0.5
    const linhas = [
      ['Carimbo de data/hora', 'Qual projeto foi entregue? ', 'Qual o ano de edição?', 'Qual o nome da instituição beneciada?', 'Em que mês se refere a resposta do questionário?', 'De qual ano? ', '  Se possível, informar o número exato de empréstimos:  '],
      [serial, 'Cantos de Leitura', 2026, 'EMEF Pedro Bandeira', 'Setembro', 2026, 42],
      [],
      ['', '', '', '', '', '', ''],
      [serial + 1, 'ImpactaLab', 2026, 'EMEI Ziraldo', 'Outubro'], // linha mais curta que o cabeçalho
    ]
    const envios = enviosDaPlanilha(linhas, 'America/Sao_Paulo')
    expect(envios).toHaveLength(2)
    expect(envios[0].titulos).toEqual(linhas[0])
    expect(envios[0].valores).toEqual(['2026-10-22T15:00:00.000Z', 'Cantos de Leitura', '2026', 'EMEF Pedro Bandeira', 'Setembro', '2026', '42'])
    expect(envios[0].referencia).toBe('planilha linha 2')
    expect(envios[1].valores).toEqual(['2026-10-23T15:00:00.000Z', 'ImpactaLab', '2026', 'EMEI Ziraldo', 'Outubro', '', ''])

    // e segue o mesmo caminho do script: projeto, ano de edição, mês e ano em campos próprios
    const { mapa } = mapearPerguntas(envios[0].titulos)
    const r = respostaDoFormulario(envios[0].valores, mapa, envios[0].referencia)
    expect([r.projeto_informado, r.ano_edicao, r.mes_informado, r.ano_informado]).toEqual(['Cantos de Leitura', '2026', 'Setembro', '2026'])
    expect(r.emprestimos_exato).toBe('42')
  })

  it('o mesmo envio pelo script e pela planilha tem o mesmo código de resposta (não duplica)', () => {
    const titulos = ['Carimbo de data/hora', 'Qual projeto foi entregue? ', 'Qual o nome da instituição beneciada?', 'Em que mês se refere a resposta do questionário?']
    const [daPlanilha] = enviosDaPlanilha([titulos, [46317 + 0.5, 'Cantos de Leitura', 'EMEF Pedro Bandeira', 'Setembro']], 'America/Sao_Paulo')
    const doScript = ['2026-10-22T15:00:00.123Z', 'Cantos de Leitura', 'EMEF Pedro Bandeira', 'Setembro']
    const { mapa } = mapearPerguntas(titulos)
    expect(respostaDoFormulario(daPlanilha.valores, mapa, 'x').resposta_id).toBe(respostaDoFormulario(doScript, mapa, 'y').resposta_id)
  })

  it('projeto que já traz o ano não ganha o ano repetido', () => {
    const titulos = ['Carimbo de data/hora', 'Qual projeto foi entregue? ', 'Qual o ano de edição?', 'Qual o nome da instituição beneciada?', 'Em que mês se refere a resposta do questionário?']
    const { mapa } = mapearPerguntas(titulos)
    const r = respostaDoFormulario(['2026-10-22T15:00:00Z', 'ImpactaLab 2026', '2026', 'EMEI Ziraldo', 'Outubro'], mapa, 'x')
    expect(r.projeto_informado).toBe('ImpactaLab 2026')
  })
})
