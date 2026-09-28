import { describe, expect, it } from 'vitest'
import { limiteDePresencas, validarPresenca } from '@/lib/presenca'

const assinatura = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg=='
const valida = { name: '  Maria   da  Silva ', role: 'Monitor(a)', cpf: '529.982.247-25', signature: assinatura, consent: true }

describe('Presença enviada pelo Voluntário', () => {
  it('aceita uma Presença completa e normaliza nome e CPF', () => {
    const r = validarPresenca(valida)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.presenca).toEqual({ name: 'Maria da Silva', role: 'Monitor(a)', cpf: '52998224725', signature: assinatura })
  })

  it('exige nome e sobrenome', () => {
    const r = validarPresenca({ ...valida, name: 'Maria' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors)).toEqual(['name'])
  })

  it('recusa nome que o Excel executaria como fórmula', () => {
    const r = validarPresenca({ ...valida, name: '=HYPERLINK("site") Silva' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.name).toBeDefined()
  })

  it('recusa cargo que começa com símbolo de fórmula', () => {
    const r = validarPresenca({ ...valida, role: '@SOMA(1;2)' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.role).toBeDefined()
  })

  it('recusa CPF inválido', () => {
    const r = validarPresenca({ ...valida, cpf: '529.982.247-24' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.cpf).toBeDefined()
  })

  it('exige Assinatura em PNG e com tamanho de uma assinatura real', () => {
    const semAssinatura = validarPresenca({ ...valida, signature: '' })
    const outraImagem = validarPresenca({ ...valida, signature: 'data:image/svg+xml;base64,PHN2Zz4=' })
    const enorme = validarPresenca({ ...valida, signature: 'data:image/png;base64,' + 'A'.repeat(200_000) })
    for (const r of [semAssinatura, outraImagem, enorme]) {
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.errors.signature).toBeDefined()
    }
  })

  it('exige Consentimento explícito', () => {
    const r = validarPresenca({ ...valida, consent: false })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.consent).toBeDefined()
  })
})

describe('Limite de Presenças por Lista', () => {
  it('aceita até o dobro dos Participantes previstos', () => {
    expect(limiteDePresencas(25)).toBe(50)
  })

  it('dá folga mínima de 20 Presenças em listas pequenas', () => {
    expect(limiteDePresencas(5)).toBe(25)
  })
})
