// Porte de Nath-Automacao/tests/relatorio.test.js.
import { describe, expect, it } from 'vitest'
import { chavePatrocinador, listarPatrocinadores, montarRelatorioPatrocinador, textoRelatorio } from '@/lib/espacos/relatorio'
import { TITULOS_FORM, cenarioBase, ciclo, enviar, envio, sincronizar } from './cenario'

const COL_BOAS_PRATICAS = TITULOS_FORM.findIndex(t => /boas práticas/.test(t))
const COL_DESAFIOS = TITULOS_FORM.findIndex(t => /principais desafios/.test(t))

// Julho encerrado (ninguém respondeu), agosto aberto; duas escolas escreveram relatos.
function cenarioRelatorio() {
  const e = cenarioBase()
  e.respostas = []
  e.ciclos = [{ ciclo_id: '2026-07', prazo: '', situacao: 'encerrado' }, { ciclo_id: '2026-08', prazo: '', situacao: 'aberto' }]
  const relatos: Record<number, Record<number, string>> = {
    1: { [COL_BOAS_PRATICAS]: 'Criamos o clube de leitura das sextas, e os alunos do 5º ano passaram a levar livros para casa toda semana.' },
    2: { [COL_DESAFIOS]: 'Falta um professor dedicado ao espaço no período da tarde, então a sala fica fechada dois dias por semana.' },
    3: { [COL_BOAS_PRATICAS]: 'ok' },
  }
  const escolas = ['Jardim das Letras', 'EMEF Monteiro Lobato', 'E.M. Cecília Meireles', 'EE Cora Coralina', 'Escola Municipal Ruth Rocha', 'EMEI Ziraldo']
  for (let i = 1; i <= 5; i++) {
    enviar(e, envio({ quando: `2026-09-0${i}T10:00:00-03:00`, escola: escolas[i], mes: 'Agosto',
      visitas: `Total de visitas no mês: ${100 + i}  Média diária de visitas: 5`,
      emprestimos: `Total de livros emprestados no mês: ${10 * i}`, atividades: `Total de eventos: ${i}`, extras: relatos[i] }))
  }
  sincronizar(e)
  return e
}
const relatorio = (e: ReturnType<typeof cenarioRelatorio>, de: string, ate: string, pat = chavePatrocinador('Patrocinador X')) =>
  montarRelatorioPatrocinador(e, pat, de, ate, new Date('2026-09-20T12:00:00-03:00'))

describe('Espaços de Leitura · relatório por patrocinador', () => {
  it('variações do nome do patrocinador são agrupadas', () => {
    expect(chavePatrocinador('AURORA - Cantos 8º')).toBe(chavePatrocinador('Aurora'))
    expect(chavePatrocinador('Horizonte 2025')).toBe(chavePatrocinador('HORIZONTE'))
    expect(chavePatrocinador('Grupo Ipê')).not.toBe(chavePatrocinador('Tintas Mar'))
    const g = listarPatrocinadores([{ patrocinador: 'Horizonte 2025', acompanhar: 'sim' }, { patrocinador: 'HORIZONTE', acompanhar: 'sim' }, { patrocinador: 'Horizonte 2025', acompanhar: 'não' }])
    expect(g.length).toBe(1)
    expect([g[0].nome, g[0].formas.length, g[0].acompanhados]).toEqual(['Horizonte', 2, 2])
  })

  it('números do relatório batem com o ciclo e a grade mostra cada mês', () => {
    const e = cenarioRelatorio()
    const r = relatorio(e, '2026-07', '2026-08')
    const agosto = ciclo(e, '2026-08')
    expect([r.patrocinador, r.escolas]).toEqual(['Patrocinador X', 8])
    // julho: ninguém respondeu (8 pendentes); agosto: 5 de 8
    expect(r.resumo.esperadas).toBe(16)
    expect(r.resumo.respondidas).toBe(agosto.respondidas)
    expect(r.resumo.visitas).toBe(agosto.visitas)
    expect(r.resumo.taxa).toBe(Math.round(10000 * 5 / 16) / 10000)
    expect(r.grade.find(g => g.escola === 'EMEF Monteiro Lobato')!.meses).toEqual({ '2026-07': 'pendente', '2026-08': 'respondida' })
    expect(r.grade.find(g => g.escola === 'Jardim das Letras')!.pendentes_seguidos).toBe(2)
    expect(r.atencao.some(a => /Jardim das Letras.*2 meses seguidos/.test(a))).toBe(true)
  })

  it('relatos são trechos literais com a fonte; textos curtos ficam de fora', () => {
    const r = relatorio(cenarioRelatorio(), '2026-08', '2026-08')
    expect(r.relatos.resultados.length).toBe(1)
    expect(r.relatos.resultados[0]).toMatchObject({
      texto: 'Criamos o clube de leitura das sextas, e os alunos do 5º ano passaram a levar livros para casa toda semana.',
      escola: 'EMEF Monteiro Lobato', mes: 'agosto/2026',
    })
    expect(r.relatos.desafios.length).toBe(1)
    expect(r.relatos.desafios[0].texto).toMatch(/Falta um professor/)
  })

  it('resumo em texto', () => {
    const r = relatorio(cenarioRelatorio(), '2026-07', '2026-08')
    const texto = textoRelatorio(r)
    expect(texto).toMatch(/Relatório interno — Patrocinador X — julho\/2026 a agosto\/2026/)
    expect(texto).toMatch(/5 de 16 esperadas \(taxa 31%\)/)
  })

  it('mês sem ciclo e período inválido', () => {
    const e = cenarioRelatorio()
    expect(relatorio(e, '2026-06', '2026-08').atencao.some(a => /sem ciclo aberto no sistema \(junho\/2026\)/.test(a))).toBe(true)
    expect(() => relatorio(e, '2026-08', '2026-07')).toThrow(/Período inválido/)
    expect(() => relatorio(e, '2026-07', '2026-08', 'NINGUEM')).toThrow(/Nenhuma escola/)
  })
})
