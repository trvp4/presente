// Espaços de Leitura · tela Respostas: o que cada escola respondeu, para a Equipe ler (app/(painel)/espacos/respostas).
import type { Registro } from './regras'

// Ordem de leitura: formulário novo (nov/2026) primeiro, depois as perguntas que só o antigo tinha.
const CAMPOS: [string, string][] = [
  ['responsavel', 'Responsável pela resposta'],
  ['gestao', 'Gestão do espaço'],
  ['cronograma', 'Cronograma'],
  ['uso_no_mes', 'O espaço foi usado no mês?'],
  ['atividades_turmas', 'Turmas que usaram'],
  ['estudantes_texto', 'Estudantes que usaram o espaço'],
  ['formas_uso', 'Formas de utilização'],
  ['temas', 'Temas mais procurados'],
  ['emprestimos_faixa', 'Empréstimos para estudantes'],
  ['emprestimos_exato', 'Número exato de empréstimos'],
  ['emprestimos_prof', 'Empréstimos para professores'],
  ['emprestimos_prof_titulos', 'Títulos emprestados a professores'],
  ['atividades_faixa', 'Atividades pedagógicas no mês'],
  ['atividades_realizadas', 'Principais atividades'],
  ['livros_procurados', 'Livros mais procurados'],
  ['resultados', 'Resultados, destaques ou dificuldades'],
  // só no formulário antigo
  ['visitas_texto', 'Visitas no mês'],
  ['emprestimos_texto', 'Empréstimos no mês'],
  ['atividades_texto', 'Atividades no mês'],
  ['faixa_uso_texto', 'Percentual de alunos que usaram'],
  ['atividade_mais_realizada', 'Atividade mais realizada'],
  ['faixa_etaria', 'Faixa etária'],
  ['fora_cronograma', 'Atividades fora do cronograma'],
  ['planejadas', 'Atividades planejadas'],
  ['atores', 'Atores envolvidos'],
  ['rede', 'Rede de atores'],
  ['potenciais', 'Principais potenciais'],
  ['desafios', 'Principais desafios'],
  ['perc_atrativa', 'O espaço é atrativo?'],
  ['perc_encontra', 'Os leitores encontram o que procuram?'],
  ['perc_desempenho', 'Melhorou o desempenho dos alunos?'],
  ['perc_integracao', 'Melhorou a integração?'],
  ['perc_comunidade', 'A comunidade participa?'],
  ['boas_praticas', 'Boas práticas'],
  ['alfabetizacao', 'Alfabetização'],
  ['impacto_comunidade', 'Impacto na comunidade'],
  ['melhorias', 'O que podemos melhorar'],
  ['anexos', 'Anexos'],
]

const texto = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())

/** As perguntas que a escola respondeu, na ordem de leitura, com o rótulo de cada uma. */
export function camposPreenchidos(r: Registro) {
  return CAMPOS.flatMap(([campo, rotulo]) => {
    const valor = texto(r[campo])
    return valor ? [{ campo, rotulo, valor }] : []
  })
}

type Descrever = (vinculo: string) => { escola: string; cidade: string; projeto: string }
export type FiltroRespostas = { vinculo?: string; mes?: string; projeto?: string; busca?: string }

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Respostas vigentes, mais recentes primeiro, com escola e projeto do cadastro (ou como a escola escreveu, se não foi ligada). */
export function filtrarRespostas(respostas: Registro[], f: FiltroRespostas, descrever: Descrever) {
  const busca = semAcento(f.busca?.trim() ?? '')
  return respostas
    .filter(r => r.vigente !== false)
    .map((r): Registro & { escola: string; cidade: string; projeto: string } => {
      const d = r.vinculo_id ? descrever(String(r.vinculo_id)) : null
      return {
        ...r,
        escola: d?.escola || texto(r.escola_informada) || '(escola em branco)',
        cidade: d?.cidade ?? '',
        projeto: d?.projeto || [texto(r.projeto_informado), texto(r.ano_edicao)].filter(Boolean).join(' '),
      }
    })
    .filter(r => (!f.vinculo || r.vinculo_id === f.vinculo) && (!f.mes || r.mes === f.mes) && (!f.projeto || r.projeto === f.projeto)
      && (!busca || semAcento(`${r.escola} ${r.cidade}`).includes(busca)))
    .sort((a, b) => (b.carimbo instanceof Date ? +b.carimbo : 0) - (a.carimbo instanceof Date ? +a.carimbo : 0))
}
