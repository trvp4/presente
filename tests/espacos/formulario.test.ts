import { describe, expect, it } from 'vitest'
import { linhaDaResposta, lerEnvio } from '@/lib/espacos/formulario'
import { respostaDoFormulario, mapearPerguntas } from '@/lib/espacos/regras'
import { TITULOS_FORM, TITULOS_FORM_NOV2026, envio } from './cenario'
import { PERGUNTAS_ESSENCIAIS } from '@/lib/espacos/regras'

describe('Espaços de Leitura · formulário reformulado (nov/2026)', () => {
  const t = TITULOS_FORM_NOV2026
  const { mapa, faltando } = mapearPerguntas(t)
  const titulo = (campo: string) => (mapa[campo] === undefined ? undefined : t[mapa[campo]].trim())

  it('reconhece as perguntas essenciais, senão a Central recusa toda resposta (422)', () => {
    expect(PERGUNTAS_ESSENCIAIS.filter(c => faltando.includes(c))).toEqual([])
    expect(titulo('projeto_informado')).toBe('Qual projeto foi entregue?')
    expect(titulo('escola_informada')).toBe('Qual o nome da instituição beneciada?')
    expect(titulo('mes_informado')).toBe('Em que mês se refere a resposta do questionário?')
  })

  it('"formas de utilização" não é lida como total de visitas', () => {
    expect(titulo('visitas_texto')).toBeUndefined()
  })

  it('a resposta chega com projeto, instituição e mês preenchidos', () => {
    const valores: unknown[] = t.map(() => '')
    valores[0] = '2026-11-10T12:00:00.000Z'; valores[1] = 'escola@exemplo.org'
    valores[2] = 'Cantos de Leitura'; valores[4] = 'EMEF Pedro Bandeira'; valores[6] = 'Outubro'
    const r = respostaDoFormulario(valores, mapa, 'resp-nova')
    expect(r).toMatchObject({ projeto_informado: 'Cantos de Leitura', escola_informada: 'EMEF Pedro Bandeira', mes_informado: 'Outubro' })
  })
})

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
