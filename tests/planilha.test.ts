import { describe, expect, it } from 'vitest'
import { planilhaCsv } from '@/lib/planilha'

describe('Planilha da Lista de Presença', () => {
  it('abre no Excel em português: BOM, ponto e vírgula e aspas', () => {
    expect(planilhaCsv([['Nome', 'Cargo'], ['Ana Souza', 'Monitor(a)']])).toBe('﻿"Nome";"Cargo"\r\n"Ana Souza";"Monitor(a)"')
  })

  it('escapa aspas dentro do texto', () => {
    expect(planilhaCsv([['Escola "Nova"']])).toBe('﻿"Escola ""Nova"""')
  })

  it('neutraliza textos que o Excel executaria como fórmula', () => {
    expect(planilhaCsv([['=HYPERLINK("x")', '+1', '-2', '@SOMA(1)']])).toBe(
      '﻿"\'=HYPERLINK(""x"")";"\'+1";"\'-2";"\'@SOMA(1)"',
    )
  })

  it('mantém números como números', () => {
    expect(planilhaCsv([[1, -3]])).toBe('﻿"1";"-3"')
  })
})
