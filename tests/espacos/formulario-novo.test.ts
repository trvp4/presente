// Formulário reformulado do Espaços de Leitura (em uso desde nov/2026): o que cada pergunta nova vira
// no sistema e como isso entra no ciclo, na revisão e no relatório. Os formulários antigos seguem
// cobertos por regras.test.ts e relatorio.test.ts.
import { describe, expect, it } from 'vitest'
import { mapearPerguntas, respostaDoFormulario } from '@/lib/espacos/regras'
import { chavePatrocinador, montarRelatorioPatrocinador, textoRelatorio } from '@/lib/espacos/relatorio'
import { TITULOS_FORM_NOV2026 as T, cenarioBase, ciclo, enviar, sincronizar } from './cenario'

const col = (re: RegExp) => {
  const i = T.findIndex(t => re.test(t))
  if (i < 0) throw new Error('pergunta não encontrada: ' + re)
  return i
}

type Novo = {
  quando: string; escola: string; mes: string; ano?: string; projeto?: string; anoEdicao?: string; estudantes?: string
  emprestimosFaixa?: string; emprestimosExato?: string; atividadesFaixa?: string; extras?: Record<number, string>
}
/** Envio do formulário novo com os campos principais; o resto fica em branco. */
function envioNovo(o: Novo) {
  const l: unknown[] = T.map(() => '')
  l[0] = new Date(o.quando); l[1] = 'escola@exemplo.org'
  l[col(/Qual projeto foi entregue/)] = o.projeto ?? 'Cantos de Leitura'
  l[col(/ano de edição/)] = o.anoEdicao ?? '2026'
  l[col(/nome da instituição/)] = o.escola
  l[col(/Em que mês/)] = o.mes
  l[col(/De qual ano/)] = o.ano ?? '2026'
  l[col(/número aproximado de estudantes/)] = o.estudantes ?? '120'
  l[col(/empréstimo de livros para os estudantes/)] = o.emprestimosFaixa ?? 'Sim, de 11 a 30 livros'
  l[col(/número exato de empréstimos/)] = o.emprestimosExato ?? '18'
  l[col(/Quantas atividades pedagógicas/)] = o.atividadesFaixa ?? '( ) 4 a 6'
  for (const [i, v] of Object.entries(o.extras ?? {})) l[+i] = v
  return l
}
const enviarNovo = (e: ReturnType<typeof cenarioBase>, o: Novo) => enviar(e, envioNovo(o), T)
const resposta = (e: ReturnType<typeof cenarioBase>, escola: string) => e.respostas.filter(r => r.escola_informada === escola).at(-1)!

describe('Formulário novo · perguntas', () => {
  it('toda pergunta do formulário novo tem um campo no sistema', () => {
    const { mapa } = mapearPerguntas(T)
    const usados = new Set(Object.values(mapa))
    expect(T.filter((_, i) => !usados.has(i)).map(t => t.trim())).toEqual([])
  })

  it('cada pergunta cai no campo certo (as parecidas não se confundem)', () => {
    const { mapa } = mapearPerguntas(T)
    const titulo = (campo: string) => T[mapa[campo]]?.trim()
    expect(titulo('emprestimos_faixa')).toBe('Houve empréstimo de livros para os estudantes?')
    expect(titulo('emprestimos_exato')).toBe('Se possível, informar o número exato de empréstimos:')
    expect(titulo('emprestimos_prof')).toBe('Houve empréstimo de livros para professores/educadores?')
    expect(titulo('gestao')).toMatch(/^O espaço de leitura tem um responsável pela organização/)
    expect(titulo('responsavel')).toMatch(/^Quem é o responsável por estar respondendo/)
    expect(titulo('ano_informado')).toBe('De qual ano?')
    expect(titulo('ano_edicao')).toBe('Qual o ano de edição?')
    expect(titulo('formas_uso')).toBe('Quais foram as principais formas de utilização do Espaço de Leitura?')
    expect(mapa.visitas_texto).toBeUndefined()
    expect(mapa.emprestimos_texto).toBeUndefined()
  })

  it('o formulário antigo continua com os mesmos campos', async () => {
    const { TITULOS_FORM } = await import('./cenario')
    const { mapa } = mapearPerguntas(TITULOS_FORM)
    expect(TITULOS_FORM[mapa.emprestimos_texto]).toMatch(/^Responda sobre empréstimo de livros/)
    expect(TITULOS_FORM[mapa.visitas_texto]).toMatch(/^Responda sobre a utilização do espaço/)
    expect(mapa.emprestimos_faixa).toBeUndefined()
  })

  it('reenviar depois de mudar o mapeamento atualiza a resposta (o carimbo de conteúdo muda)', () => {
    const valores = envioNovo({ quando: '2026-09-05T09:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto' })
    const { mapa } = mapearPerguntas(T)
    const semEstudantes = { ...mapa }
    delete semEstudantes.estudantes_texto
    expect(respostaDoFormulario(valores, mapa, 'x').hash_origem).not.toBe(respostaDoFormulario(valores, semEstudantes, 'x').hash_origem)
    expect(respostaDoFormulario(valores, mapa, 'x').hash_origem).toBe(respostaDoFormulario(valores, { ...mapa }, 'x').hash_origem)
  })
})

describe('Formulário novo · resposta no ciclo', () => {
  it('resposta completa entra como válida, sem cobrar visitas nem total de eventos', () => {
    const e = cenarioBase()
    enviarNovo(e, { quando: '2026-09-05T09:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto' })
    sincronizar(e)
    const r = resposta(e, 'EMEF Pedro Bandeira')
    expect(r.motivos).toBe('')
    expect(r.situacao).toBe('válida')
    expect(r.vinculo_id).toBe('V8') // "Cantos de Leitura" → o único projeto Cantos de Leitura da escola
    expect(r.mes).toBe('2026-08')
    expect([r.total_estudantes, r.total_emprestimos, r.faixa_emprestimos, r.faixa_atividades]).toEqual([120, 18, '11 a 30', '4 a 6'])
    expect(r.total_eventos).toBe('')
    expect(ciclo(e).respondidas).toBe(6)
    expect(ciclo(e).estudantes).toBe(120)
  })

  it('o ano vem da pergunta "De qual ano?", não da data do envio', () => {
    const e = cenarioBase()
    enviarNovo(e, { quando: '2026-09-05T09:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto', ano: '2025' })
    sincronizar(e)
    expect(resposta(e, 'EMEF Pedro Bandeira').mes).toBe('2025-08')
  })

  it('empréstimos: soma o número exato; sem número, guarda a faixa e não manda para revisão', () => {
    const e = cenarioBase()
    enviarNovo(e, { quando: '2026-09-05T09:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto', emprestimosExato: 'não sei informar' })
    enviarNovo(e, { quando: '2026-09-05T10:00:00-03:00', escola: 'Jardim das Letras', mes: 'Agosto', emprestimosFaixa: 'Não houve empréstimos', emprestimosExato: '-' })
    sincronizar(e)
    const semNumero = resposta(e, 'EMEF Pedro Bandeira')
    expect([semNumero.total_emprestimos, semNumero.faixa_emprestimos, semNumero.situacao]).toEqual(['', '11 a 30', 'válida'])
    const nenhum = resposta(e, 'Jardim das Letras')
    expect([nenhum.total_emprestimos, nenhum.faixa_emprestimos]).toEqual([0, 'Não houve'])
  })

  it('atividades: "Nenhuma" é zero; as outras faixas não viram número', () => {
    const e = cenarioBase()
    enviarNovo(e, { quando: '2026-09-05T09:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto', atividadesFaixa: '( ) Nenhuma' })
    enviarNovo(e, { quando: '2026-09-05T10:00:00-03:00', escola: 'Jardim das Letras', mes: 'Agosto', atividadesFaixa: '( ) Mais de 10' })
    sincronizar(e)
    expect([resposta(e, 'EMEF Pedro Bandeira').total_eventos, resposta(e, 'EMEF Pedro Bandeira').faixa_atividades]).toEqual([0, 'Nenhuma'])
    expect([resposta(e, 'Jardim das Letras').total_eventos, resposta(e, 'Jardim das Letras').faixa_atividades]).toEqual(['', 'Mais de 10'])
  })

  it('estudantes escritos por extenso: lê o número; sem número, vai para revisão e a correção resolve', () => {
    const e = cenarioBase()
    enviarNovo(e, { quando: '2026-09-05T09:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto', estudantes: 'Cerca de 200 alunos' })
    enviarNovo(e, { quando: '2026-09-05T10:00:00-03:00', escola: 'Jardim das Letras', mes: 'Agosto', estudantes: 'Todas as turmas da manhã' })
    sincronizar(e)
    expect(resposta(e, 'EMEF Pedro Bandeira').total_estudantes).toBe(200)
    const r = resposta(e, 'Jardim das Letras')
    expect(r.situacao).toBe('em revisão')
    expect(r.motivos).toMatch(/estudantes: número não encontrado/)
    expect(r.estudantes_estado).toBe('não lido')

    r.estudantes_corrigidos = 150
    sincronizar(e)
    expect([r.situacao, r.total_estudantes, r.estudantes_estado]).toEqual(['válida', 150, 'corrigido'])
  })

  it('projeto com o mesmo nome em mais de um vínculo da escola: revisão explica a dúvida', () => {
    const e = cenarioBase()
    e.projetos.push({ projeto_id: 'P2', nome: 'Cantos de Leitura 10º', nomes_no_formulario: '', ativo: 'sim' })
    e.vinculos.push({ vinculo_id: 'V9', escola_id: 'E8', projeto_id: 'P2', patrocinador: 'Patrocinador Y', inicio: '2026-01', fim: '', acompanhar: 'sim' })
    enviarNovo(e, { quando: '2026-09-05T09:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto' })
    sincronizar(e)
    const r = resposta(e, 'EMEF Pedro Bandeira')
    expect(r.situacao).toBe('em revisão')
    expect(r.motivos).toMatch(/projeto "Cantos de Leitura" combina com mais de um vínculo da escola/)
  })

  it('projeto com o nome geral cadastrado, mas a escola está numa edição dele: vale a edição da escola', () => {
    const e = cenarioBase()
    e.projetos.push({ projeto_id: 'PG', nome: 'Biblioteca Futuro', nomes_no_formulario: '', ativo: 'sim' })
    e.projetos.push({ projeto_id: 'P40', nome: 'Biblioteca Futuro 4.0', nomes_no_formulario: '', ativo: 'sim' })
    e.vinculos.push({ vinculo_id: 'V40', escola_id: 'E8', projeto_id: 'P40', patrocinador: 'Patrocinador Y', inicio: '2026-01', fim: '', acompanhar: 'sim' })
    enviarNovo(e, { quando: '2026-10-30T09:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Outubro', projeto: 'Biblioteca Futuro' })
    sincronizar(e)
    expect(resposta(e, 'EMEF Pedro Bandeira').vinculo_id).toBe('V40')
  })

  it('o ano de edição desempata a escola que está no mesmo projeto em dois anos', () => {
    const e = cenarioBase()
    e.projetos.push({ projeto_id: 'P26', nome: 'Cantos de Leitura - 2026', nomes_no_formulario: '', ativo: 'sim' })
    e.projetos.push({ projeto_id: 'P27', nome: 'Cantos de Leitura 2027', nomes_no_formulario: '', ativo: 'sim' })
    e.vinculos.push({ vinculo_id: 'V26', escola_id: 'E8', projeto_id: 'P26', patrocinador: 'Patrocinador Y', inicio: '2026-01', fim: '', acompanhar: 'sim' })
    e.vinculos.push({ vinculo_id: 'V27', escola_id: 'E8', projeto_id: 'P27', patrocinador: 'Patrocinador Y', inicio: '2026-01', fim: '', acompanhar: 'sim' })
    enviarNovo(e, { quando: '2026-09-05T09:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto', anoEdicao: '2027' })
    sincronizar(e)
    expect(resposta(e, 'EMEF Pedro Bandeira').vinculo_id).toBe('V27')
  })
})

describe('Formulário novo · relatório do patrocinador', () => {
  const RESULTADOS = 'Os alunos do 3º ano passaram a pedir a roda de leitura toda semana, e duas turmas montaram um mural de resenhas.'
  const LIVROS = 'O Menino Maluquinho, Diário de um Banana'

  function cenario() {
    const e = cenarioBase()
    e.respostas = []
    enviarNovo(e, { quando: '2026-09-05T09:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto',
      extras: { [col(/principais resultados, destaques/)]: RESULTADOS, [col(/livros ou títulos mais procurados/)]: LIVROS } })
    enviarNovo(e, { quando: '2026-09-05T10:00:00-03:00', escola: 'Jardim das Letras', mes: 'Agosto', estudantes: '80',
      emprestimosFaixa: 'Sim, mais de 50 livros', emprestimosExato: '64', atividadesFaixa: '( ) 1 a 3' })
    sincronizar(e)
    return montarRelatorioPatrocinador(e, chavePatrocinador('Patrocinador X'), '2026-08', '2026-08', new Date('2026-09-20T12:00:00-03:00'))
  }

  it('soma estudantes e empréstimos e mostra as faixas', () => {
    const r = cenario()
    expect([r.resumo.estudantes, r.resumo.com_estudantes]).toEqual([200, 2])
    expect([r.resumo.emprestimos, r.resumo.com_emprestimos]).toEqual([18 + 64, 2])
    expect(r.faixas_emprestimos).toEqual({ '11 a 30': 1, 'Mais de 50': 1 })
    expect(r.faixas_atividades).toEqual({ '4 a 6': 1, '1 a 3': 1 })
  })

  it('relatos novos aparecem com a fonte; livros procurados vão para "interesse dos leitores"', () => {
    const r = cenario()
    expect(r.relatos.resultados).toContainEqual(expect.objectContaining({ texto: RESULTADOS, campo: 'Resultados e dificuldades', escola: 'EMEF Pedro Bandeira' }))
    expect(r.relatos.interesse).toContainEqual(expect.objectContaining({ texto: LIVROS, campo: 'Livros mais procurados' }))
  })

  it('não cobra visitas de quem respondeu o formulário novo', () => {
    const r = cenario()
    expect(r.atencao.join('\n')).not.toMatch(/Visitas:/)
    expect(textoRelatorio(r)).toMatch(/200 estudantes atendidos/)
  })
})
