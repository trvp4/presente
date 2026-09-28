import { describe, expect, it } from 'vitest'
import { linhaDaResposta, lerEnvio } from '@/lib/espacos/formulario'
import { respostaDoFormulario, mapearPerguntas } from '@/lib/espacos/regras'
import { TITULOS_FORM, envio } from './cenario'

describe('Espaços de Leitura · envio recebido do Google Forms', () => {
  it('aceita títulos e valores do mesmo tamanho, com o carimbo em texto', () => {
    const valores = envio({ quando: '2026-09-10T09:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto' })
    valores[0] = '2026-09-10T12:00:00.000Z'
    expect(lerEnvio({ titulos: TITULOS_FORM, valores, referencia: 'resp-abc' })).toMatchObject({ ok: true, referencia: 'resp-abc' })
  })

  it('recusa envio malformado ou grande demais', () => {
    expect(lerEnvio(null).ok).toBe(false)
    expect(lerEnvio({ titulos: ['a'], valores: [] }).ok).toBe(false)
    expect(lerEnvio({ titulos: 'x', valores: [] }).ok).toBe(false)
    expect(lerEnvio({ titulos: ['a'], valores: ['x'.repeat(60_000)] }).ok).toBe(false)
    expect(lerEnvio({ titulos: Array(200).fill('a'), valores: Array(200).fill('') }).ok).toBe(false)
  })

  it('a linha do banco leva só o que a escola enviou, nunca campos da revisão da Equipe', () => {
    const valores = envio({ quando: '2026-09-10T09:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto', visitas: '120' })
    const r = respostaDoFormulario(valores, mapearPerguntas(TITULOS_FORM).mapa, 'resp-abc')
    r.vinculo_manual = 'não deveria ir'
    const linha = linhaDaResposta(r)
    expect(linha).toMatchObject({ id: r.resposta_id, hash_origem: r.hash_origem, escola_informada: 'EMEF Pedro Bandeira',
      mes_informado: 'Agosto', visitas_texto: '120', carimbo: '2026-09-10T12:00:00.000Z', referencia_origem: 'linha resp-abc' })
    expect(linha).not.toHaveProperty('vinculo_manual')
    expect(linha).not.toHaveProperty('resposta_id')
  })
})
