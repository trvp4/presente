import { describe, expect, it } from 'vitest'
import { validarProjeto } from '@/lib/projeto'

describe('Projeto cadastrado pela Equipe', () => {
  it('aceita nome e Pronac, limpando espaços e pontuação do Pronac', () => {
    expect(validarProjeto({ name: '  Biblioteca Viva ', pronac: '123.456' })).toEqual({ ok: true, projeto: { name: 'Biblioteca Viva', pronac: '123456' } })
  })

  it('exige o nome do Projeto', () => {
    expect(validarProjeto({ name: '   ', pronac: '123456' })).toEqual({ ok: false, error: 'Informe o nome do projeto.' })
  })

  it('exige Pronac com 5 a 7 números', () => {
    expect(validarProjeto({ name: 'Biblioteca Viva', pronac: '1234' })).toEqual({ ok: false, error: 'O Pronac deve ter de 5 a 7 números.' })
    expect(validarProjeto({ name: 'Biblioteca Viva', pronac: '12345678' })).toEqual({ ok: false, error: 'O Pronac deve ter de 5 a 7 números.' })
  })
})
