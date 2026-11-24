// Tela Respostas do Espaços de Leitura: o que a escola respondeu, na ordem do formulário, e a lista filtrada.
import { describe, expect, it } from 'vitest'
import { camposPreenchidos, filtrarRespostas } from '@/lib/espacos/respostas'

describe('Respostas · campos da resposta', () => {
  it('mostra só as perguntas respondidas, na ordem do formulário novo, com o rótulo de cada uma', () => {
    const campos = camposPreenchidos({
      carimbo: new Date(), email_respondente: 'escola@exemplo.org', escola_informada: 'EMEF X', projeto_informado: 'Biblioteca Futuro',
      resultados: 'Clube de leitura do 5º ano.', responsavel: 'Ana, coordenadora', temas: '', uso_no_mes: 'Sim, frequentemente',
      emprestimos_faixa: 'Sim, de 31 a 50 livros', emprestimos_exato: '46',
    })
    expect(campos.map(c => c.rotulo)).toEqual([
      'Responsável pela resposta', 'O espaço foi usado no mês?', 'Empréstimos para estudantes', 'Número exato de empréstimos', 'Resultados, destaques ou dificuldades',
    ])
    expect(campos.at(-1)).toMatchObject({ campo: 'resultados', valor: 'Clube de leitura do 5º ano.' })
  })

  it('respostas do formulário antigo também aparecem, com os rótulos do antigo', () => {
    const campos = camposPreenchidos({ visitas_texto: '120 visitas', boas_praticas: 'Roda de leitura', desafios: 'Falta de estantes' })
    expect(campos.map(c => c.rotulo)).toEqual(['Visitas no mês', 'Principais desafios', 'Boas práticas'])
  })
})

describe('Respostas · lista', () => {
  const r = (o: Record<string, unknown>) => ({ vigente: true, situacao: 'válida', mes: '2026-10', carimbo: new Date('2026-10-30T12:00:00Z'), ...o })
  const descrever = (v: string) => ({ escola: { V1: 'EMEF Monteiro Lobato', V2: 'EM Cora Coralina' }[v] ?? '', cidade: v === 'V1' ? 'Campinas – SP' : 'Recife – PE', projeto: v === 'V1' ? 'Biblioteca Futuro 4.0' : 'Sala Circular' })
  const todas = [
    r({ resposta_id: 'a', vinculo_id: 'V1', carimbo: new Date('2026-10-30T12:00:00Z') }),
    r({ resposta_id: 'b', vinculo_id: 'V2', mes: '2026-11', carimbo: new Date('2026-11-11T12:00:00Z') }),
    r({ resposta_id: 'c', vinculo_id: '', escola_informada: 'Col. Est. Arapoema', projeto_informado: 'Cantos de Leitura', situacao: 'em revisão', carimbo: new Date('2026-11-18T12:00:00Z') }),
    r({ resposta_id: 'velha', vinculo_id: 'V1', vigente: false }),
  ]

  it('mais recentes primeiro; versões antigas de uma resposta editada ficam de fora', () => {
    expect(filtrarRespostas(todas, {}, descrever).map(x => x.resposta_id)).toEqual(['c', 'b', 'a'])
  })

  it('filtra pela escola (link da tela Escolas), pelo mês, pelo projeto e pela busca sem acento', () => {
    expect(filtrarRespostas(todas, { vinculo: 'V1' }, descrever).map(x => x.resposta_id)).toEqual(['a'])
    expect(filtrarRespostas(todas, { mes: '2026-11' }, descrever).map(x => x.resposta_id)).toEqual(['b'])
    expect(filtrarRespostas(todas, { projeto: 'Sala Circular' }, descrever).map(x => x.resposta_id)).toEqual(['b'])
    expect(filtrarRespostas(todas, { busca: 'campinas' }, descrever).map(x => x.resposta_id)).toEqual(['a'])
    expect(filtrarRespostas(todas, { busca: 'arapoema' }, descrever).map(x => x.resposta_id)).toEqual(['c']) // sem vínculo: usa o nome que a escola escreveu
  })

  it('cada item traz a escola e o projeto do cadastro, ou o que a escola escreveu quando não foi ligada', () => {
    const [c, b] = filtrarRespostas(todas, {}, descrever)
    expect([b.escola, b.projeto, b.cidade]).toEqual(['EM Cora Coralina', 'Sala Circular', 'Recife – PE'])
    expect([c.escola, c.projeto]).toEqual(['Col. Est. Arapoema', 'Cantos de Leitura'])
  })
})
