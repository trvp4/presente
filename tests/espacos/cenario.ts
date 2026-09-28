// Cenário comum (igual a Nath-Automacao/tests/cenario.js): formulário real, 8 escolas fictícias,
// ciclo de agosto/2026, cinco escolas (E2..E6) já responderam.
import { incorporarEnvio, processar, type Registro } from '@/lib/espacos/regras'

// Enunciados reais do formulário, na ordem em que aparecem.
export const TITULOS_FORM = [
  'Carimbo de data/hora', 'Endereço de e-mail',
  'Qual o projeto recebido pela instituição? ', 'Qual a instituição recebeu o projeto?',
  'Em que mês  é referente a resposta desse formulário?',
  'Quem são atualmente os atores envolvidos nas atividades do projeto? ',
  'O projeto possibilitou a formação de uma rede de atores que articulam as atividades que acontecem no espaço?',
  'Quais os principais potenciais do projeto na instituição?',
  'Quais os principais desafios enfrentados pelo projeto nesse mês?',
  'Responda sobre a utilização do espaço: Total de visitas no mês: ____ Média diária de visitas: _____',
  'Percentual de alunos que usaram a biblioteca (aproximado)',
  'Responda sobre empréstimo de livros Total de livros emprestados no mês: ____ Média de livros emprestados por aluno: ____',
  'Responda de acordo com as atividades realizadas no espaço Total de eventos/atividades realizadas pela biblioteca: ____',
  'Qual o cronograma mensal de atividades no espaço? ',
  'Quais atividades foram realizadas neste período e com quais turmas? Especifique',
  'Qual a atividade mais realizada dentro do espaço?',
  'Qual a faixa etária e nível de ensino dos estudantes que fazem o uso do espaço? ',
  'Houveram outras atividades realizadas no espaço além do seguimento do cronograma? ',
  'Há outras atividades sendo planejadas para serem realizadas no espaço? Quais? ',
  'Percepção dos Alunos (Entrevistar ou coletar por enquete simples) Os alunos acham a biblioteca atrativa?',
  'Percepção dos Alunos Os alunos conseguem encontrar os livros ou materiais que procuram?',
  'Percepção dos Professores A biblioteca está ajudando a melhorar o desempenho dos alunos em leitura/escrita?',
  'Percepção dos Professores Qual o nível de integração da biblioteca com o planejamento pedagógico?',
  'Percepção da Comunidade Escolar A biblioteca atende às necessidades da comunidade?',
  'Quais oportunidades ou boas práticas podem ser destacadas neste mês a partir da utilização do espaço?',
  'Com a chegada da biblioteca, houve mudança/melhoria no processo de alfabetização dos alunos? Se sim, explique como',
  'Discorra sobre as melhorias espaço impactou dentro da comunidade escolar.',
  'O que podemos melhorar nos espaços de leitura?',
  'Anexos, documentos, fotos ou vídeos sobre as atividades no espaço',
]

export const ESCOLAS = ['Jardim das Letras', 'EMEF Monteiro Lobato', 'E.M. Cecília Meireles', 'EE Cora Coralina',
  'Escola Municipal Ruth Rocha', 'EMEI Ziraldo', 'CEI Ana Maria Machado', 'EMEF Pedro Bandeira']

/** Envio do Forms com os campos principais; o resto fica em branco. */
export function envio({ quando, email = 'escola@exemplo.org', projeto = 'Cantos de Leitura 9º', escola, mes,
  visitas = '', emprestimos = '', atividades = '', faixa = 'Mais de 75%', extras = {} as Record<number, string> }:
  { quando: string; email?: string; projeto?: string; escola: string; mes: string; visitas?: string; emprestimos?: string; atividades?: string; faixa?: string; extras?: Record<number, string> }) {
  const l: unknown[] = TITULOS_FORM.map(() => '')
  l[0] = new Date(quando); l[1] = email; l[2] = projeto; l[3] = escola; l[4] = mes
  l[9] = visitas; l[10] = faixa; l[11] = emprestimos; l[12] = atividades
  l[17] = 'Não' // "outras atividades além do cronograma": não pode cair no campo de atividades
  for (const [i, v] of Object.entries(extras)) l[+i] = v
  return l
}

export type Estado = {
  escolas: Registro[]; projetos: Registro[]; vinculos: Registro[]; ciclos: Registro[]
  respostas: Registro[]; obrigacoes: Registro[]; contatos: Registro[]; fechamentos: Registro[]
}

/** Cadastro com 8 escolas no mesmo projeto, ciclo de agosto aberto e 5 respostas de agosto. */
export function cenarioBase(): Estado {
  const e: Estado = {
    escolas: ESCOLAS.map((nome, i) => ({ escola_id: `E${i + 1}`, nome, apelidos: i === 0 ? 'Escola Jardim das Letras' : '', municipio: 'Cidade', uf: 'SP', situacao: 'ativa' })),
    projetos: [{ projeto_id: 'P1', nome: 'Cantos de Leitura 9º', nomes_no_formulario: 'CANTOS DE LEITURA 9º', ativo: 'sim' }],
    vinculos: ESCOLAS.map((_, i) => ({ vinculo_id: `V${i + 1}`, escola_id: `E${i + 1}`, projeto_id: 'P1', patrocinador: 'Patrocinador X', inicio: '2026-01', fim: '', acompanhar: 'sim' })),
    ciclos: [{ ciclo_id: '2026-08', prazo: '', situacao: 'aberto' }],
    respostas: [], obrigacoes: [], contatos: [], fechamentos: [],
  }
  for (let i = 1; i <= 5; i++) {
    enviar(e, envio({ quando: `2026-09-0${i}T10:00:00-03:00`, escola: ESCOLAS[i], mes: 'Agosto',
      visitas: `Total de visitas no mês: ${100 + i}  Média diária de visitas: 5`,
      emprestimos: `Total de livros emprestados no mês: ${10 * i}`, atividades: `Total de eventos: ${i}` }))
  }
  return e
}

let seq = 0
export const enviar = (e: Estado, valores: unknown[], titulos = TITULOS_FORM) => incorporarEnvio(e.respostas, titulos, valores, `envio ${++seq}`)

/** Recalcula tudo e guarda o resultado no estado (como o hub fará a cada envio ou ação da Equipe). */
export function sincronizar(e: Estado, agora = new Date('2026-09-20T12:00:00-03:00')) {
  const r = processar(e, agora)
  e.obrigacoes = r.obrigacoes
  e.ciclos = r.ciclos
  e.fechamentos = [...e.fechamentos, ...r.novosFechamentos]
  return r
}

export const ciclo = (e: Estado, id = '2026-08') => e.ciclos.find(c => c.ciclo_id === id)!
export const obrig = (e: Estado, id: string) => e.obrigacoes.find(o => o.obrigacao_id === id)
