// Formulário novo "Acompanhamento Mensal :: Espaços de Leitura" (projeto e ano de edição separados,
// mês e ano separados, faixas de empréstimo e de atividades). O antigo continua valendo (cenario.ts).
import { describe, expect, it } from 'vitest'
import { derivarResposta, mapearPerguntas, montarCadastro, respostaDoFormulario, PERGUNTAS_ESSENCIAIS } from '@/lib/espacos/regras'

// Enunciados reais do formulário novo, na ordem (com os espaços que o Forms deixa)
const TITULOS = [
  'Carimbo de data/hora', 'Endereço de e-mail',
  'Qual projeto foi entregue? ', 'Qual o ano de edição?', 'Qual o nome da instituição beneciada?',
  'Quem é o responsável por estar respondendo o formulário? Indicar nome e cargo ',
  'Em que mês se refere a resposta do questionário?', 'De qual ano? ',
  'O espaço de leitura tem um responsável pela organização? Comente sobre como está sendo realizada a gestão do espaço neste mês',
  'Qual o cronograma mensal/semanal de atividades no espaço? ',
  '  O Espaço de Leitura foi utilizado durante o mês de referência?  ',
  '  Quais turmas utilizaram o Espaço de Leitura durante o mês?  ',
  '  Qual foi o número aproximado de estudantes que utilizaram o Espaço de Leitura durante o mês?  Considerar o total de estudantes que passaram pelo espaço, mesmo que tenham utilizado mais de uma vez.    ',
  '  Quais foram as principais formas de utilização do Espaço de Leitura?  ',
  '  Quais temas ou categorias de livros foram mais procurados pelos estudantes no mês?   ex: literatura infantil, literatura brasileira, meio ambiente, histórias em quadrinhos, diversidade, socioemocional etc.  ',
  '  Houve empréstimo de livros para os estudantes?  ',
  '  Se possível, informar o número exato de empréstimos:  ',
  '  Houve empréstimo de livros para professores/educadores?  ',
  '  Se sim, quantos e quais títulos?  ',
  '  Quantas atividades pedagógicas foram realizadas no Espaço de Leitura durante o mês?  ',
  '  Quais foram as principais atividades realizadas?   Ex.: roda de leitura, contação de histórias, produção textual, pesquisa, oficinas etc.  ',
  '  Quais foram os livros ou títulos mais procurados pelos estudantes durante o mês?   Se possível, informar até 5 títulos.  ',
  'Quais foram os principais resultados, destaques ou dificuldades observados durante esse mês de utilização do espaço?',
]

const envio = (numeroEmprestimos = '42') => [
  new Date('2026-10-03T13:00:00Z'), 'escola@exemplo.org',
  'Cantos de Leitura', '2026', 'EMEF Pedro Bandeira', 'Ana Souza, coordenadora pedagógica',
  'Setembro', '2026', 'A bibliotecária organiza o espaço e o empréstimo.', 'Segundas e quartas, todas as turmas.',
  'Sim, frequentemente', 'Infantil, 1º ano, 2º ano', '150', 'Leitura livre, Contação de histórias',
  'Literatura infantil, quadrinhos', 'Sim, de 31 a 50 livros', numeroEmprestimos, 'Sim, até 5 livros', '3 títulos de literatura',
  '( ) 4 a 6', 'Roda de leitura e contação de histórias com as turmas do infantil.', 'O Menino Maluquinho, Marcelo Marmelo Martelo',
  'Os alunos passaram a pedir para ir ao espaço no recreio, e as famílias começaram a pegar livros emprestados.',
]

const cadastro = montarCadastro(
  [{ escola_id: 'E1', nome: 'EMEF Pedro Bandeira', situacao: 'ativa' }],
  [{ projeto_id: 'P1', nome: 'Cantos de Leitura - 2026', ativo: 'sim' }],
  [{ vinculo_id: 'V1', escola_id: 'E1', projeto_id: 'P1', acompanhar: 'sim' }],
)

describe('Formulário mensal novo', () => {
  it('reconhece todas as perguntas, inclusive as essenciais', () => {
    const { mapa, faltando } = mapearPerguntas(TITULOS)
    expect(PERGUNTAS_ESSENCIAIS.filter(c => faltando.includes(c))).toEqual([])
    expect(mapa.visitas_texto).toBe(12) // número de estudantes, não "formas de utilização do espaço"
    expect(mapa.emprestimos_texto).toBe(16) // o número exato, não a faixa
    expect(mapa.atividade_mais_realizada).toBe(20)
    expect(mapa.resultados_mes).toBe(22)
  })

  it('junta projeto + edição e mês + ano; lê estudantes e empréstimos; atividades ficam só como faixa', () => {
    const { mapa } = mapearPerguntas(TITULOS)
    const r = respostaDoFormulario(envio(), mapa, 'ref-1')
    expect(r.projeto_informado).toBe('Cantos de Leitura 2026')
    expect(r.mes_informado).toBe('Setembro 2026')
    expect(r.atividades_faixa).toBe('( ) 4 a 6')
    const d = derivarResposta(r, cadastro)
    expect(d).toMatchObject({ vinculo_id: 'V1', mes: '2026-09', total_visitas: 150, total_emprestimos: 42, eventos_estado: 'vazio', situacao: 'válida' })
  })

  it('sem o número exato de empréstimos a resposta não vai para a revisão só por isso', () => {
    const { mapa } = mapearPerguntas(TITULOS)
    const d = derivarResposta(respostaDoFormulario(envio(''), mapa, 'ref-2'), cadastro)
    expect(d).toMatchObject({ emprestimos_estado: 'vazio', situacao: 'válida' })
  })
})
