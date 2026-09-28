import { describe, expect, it } from 'vitest'
import { cnpjValid, cpfValid } from '@/lib/format'

describe('CPF do Voluntário', () => {
  it('aceita CPF válido, com ou sem pontuação', () => {
    expect(cpfValid('529.982.247-25')).toBe(true)
    expect(cpfValid('52998224725')).toBe(true)
  })

  it('recusa CPF com dígito verificador errado', () => {
    expect(cpfValid('529.982.247-24')).toBe(false)
  })

  it('recusa sequências repetidas, que passam na conta mas não existem', () => {
    expect(cpfValid('111.111.111-11')).toBe(false)
  })

  it('recusa CPF incompleto', () => {
    expect(cpfValid('529.982.247')).toBe(false)
  })
})

describe('CNPJ da Instituição Beneficiada', () => {
  it('aceita CNPJ válido, com ou sem pontuação', () => {
    expect(cnpjValid('11.222.333/0001-81')).toBe(true)
    expect(cnpjValid('11222333000181')).toBe(true)
  })

  it('recusa CNPJ com dígito verificador errado', () => {
    expect(cnpjValid('11.222.333/0001-82')).toBe(false)
  })

  it('recusa sequências repetidas', () => {
    expect(cnpjValid('00.000.000/0000-00')).toBe(false)
  })
})
