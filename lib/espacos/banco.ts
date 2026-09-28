// Espaços de Leitura · tabelas do Supabase → registros no formato das regras (nomes da antiga planilha),
// e o carregamento que as telas usam. Derivados são calculados na leitura (ADR 0007).
import type { SupabaseClient } from '@supabase/supabase-js'
import { processar, SITUACAO_OBRIGACAO, SITUACAO_RESPOSTA, type Registro } from './regras'
import { listarPatrocinadores } from './relatorio'
import { chaveEscola, listaPipe } from './normalizacao'

export type Linhas = {
  schools: Registro[]; projects: Registro[]; vinculos: Registro[]; ciclos: Registro[]
  respostas: Registro[]; dispensas: Registro[]; contatos: Registro[]; fechamentos: Registro[]
}

// null do banco vira '' (as regras tratam vazio como texto vazio, como na planilha)
const semNulos = (r: Registro) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ?? '']))
export const idObrigacao = (ciclo: string, vinculo: string) => ciclo + '|' + vinculo

/** Linhas do banco → estado que processar() entende. Função pura. */
type Estado = Record<'escolas' | 'projetos' | 'vinculos' | 'ciclos' | 'respostas' | 'obrigacoes' | 'contatos' | 'fechamentos', Registro[]>

export function paraRegras(b: Linhas): Estado {
  return {
    escolas: b.schools.map(s => {
      const [municipio, uf] = String(s.cidade ?? '').split(' – ')
      return { ...semNulos(s), escola_id: s.id, municipio: municipio ?? '', uf: uf ?? '', contato_nome: s.contato_nome ?? '' }
    }),
    projetos: b.projects.map(p => ({ projeto_id: p.id, nome: p.name, nomes_no_formulario: p.nomes_no_formulario ?? '', ativo: p.archived ? 'não' : 'sim' })),
    vinculos: b.vinculos.map(v => ({ ...semNulos(v), vinculo_id: v.id, escola_id: v.school_id, projeto_id: v.project_id, acompanhar: v.acompanhar === true })),
    ciclos: b.ciclos.map(c => ({ ...semNulos(c), ciclo_id: c.id })),
    respostas: b.respostas.map(r => ({ ...semNulos(r), resposta_id: r.id, carimbo: r.carimbo ? new Date(r.carimbo) : '' })),
    obrigacoes: b.dispensas.map(d => ({ obrigacao_id: idObrigacao(d.ciclo_id, d.vinculo_id), ciclo_id: d.ciclo_id, vinculo_id: d.vinculo_id, dispensa: 'sim', motivo_dispensa: d.motivo })),
    contatos: b.contatos.map(c => ({ ...semNulos(c), obrigacao_id: idObrigacao(c.ciclo_id, c.vinculo_id), data: new Date(c.data) })),
    fechamentos: b.fechamentos.map(f => ({ ...f })),
  }
}

/** Resultado de processar() → linhas novas de el_fechamentos. */
export const linhasFechamento = (novos: Registro[]) =>
  novos.map(f => ({
    ciclo_id: f.ciclo_id, versao: f.versao, registrado_em: (f.registrado_em as Date).toISOString(), assinatura: f.assinatura,
    esperadas: f.esperadas, respondidas: f.respondidas, em_revisao: f.em_revisao, pendentes: f.pendentes, dispensadas: f.dispensadas,
    taxa_resposta: f.taxa_resposta === '' ? null : f.taxa_resposta, visitas: f.visitas, emprestimos: f.emprestimos, eventos: f.eventos,
  }))

/** Lê tudo do módulo com o cliente da Equipe, recalcula e registra versões novas de fechamento. */
export async function carregarEspacos(supabase: SupabaseClient, agora = new Date()) {
  const ler = async (tabela: string, ordem?: string) => {
    const q = supabase.from(tabela).select('*')
    const { data, error } = await (ordem ? q.order(ordem) : q)
    if (error) throw new Error(`Não foi possível ler ${tabela}.`)
    return (data ?? []) as Registro[]
  }
  // ponytail: tudo em memória (dezenas de escolas, centenas de respostas); paginar se passar de ~1000 linhas por tabela
  const [schools, projects, vinculos, ciclos, respostas, dispensas, contatos, fechamentos] = await Promise.all([
    ler('schools', 'nome'), ler('projects', 'name'), ler('el_vinculos'), ler('el_ciclos', 'id'), ler('el_respostas'),
    ler('el_dispensas'), ler('el_contatos', 'data'), ler('el_fechamentos'),
  ])
  const estado = paraRegras({ schools, projects, vinculos, ciclos, respostas, dispensas, contatos, fechamentos })
  const r = processar(estado, agora)
  // Ciclo encerrado cujo resultado mudou ganha versão nova; unique(ciclo_id, versao) evita duplicar se duas telas abrirem juntas
  if (r.novosFechamentos.length) await supabase.from('el_fechamentos').insert(linhasFechamento(r.novosFechamentos))

  const escolaPorId = r.cadastro.escolaPorId, projetoPorId = r.cadastro.projetoPorId
  const descrever = (vid: string) => {
    const v = r.cadastro.vinculoPorId[vid] ?? {}, e = escolaPorId[v.escola_id] ?? {}, p = projetoPorId[v.projeto_id] ?? {}
    return { vinculo: vid, escola: String(e.nome ?? '(escola removida)'), cidade: String(e.cidade ?? ''), projeto: String(p.nome ?? ''), patrocinador: String(v.patrocinador ?? '') }
  }
  return {
    ...r,
    estado,
    schools,
    projects,
    fechamentos: [...fechamentos, ...r.novosFechamentos],
    contatos: estado.contatos,
    descrever,
    revisao: r.respostas.filter(x => x.situacao === SITUACAO_RESPOSTA.REVISAO),
    patrocinadores: listarPatrocinadores(estado.vinculos),
  }
}
export type Espacos = Awaited<ReturnType<typeof carregarEspacos>>

/** Ciclo mostrado por padrão: o aberto mais recente; sem aberto, o mais recente. */
export function cicloPadrao(ciclos: Registro[]) {
  const ordem = [...ciclos].sort((a, b) => String(b.ciclo_id).localeCompare(String(a.ciclo_id)))
  return ordem.find(c => c.situacao !== 'encerrado') ?? ordem[0] ?? null
}

/** Obrigações de um ciclo que ainda pedem ação (pendente, em revisão, dispensada), na ordem de trabalho. */
export function obrigacoesAbertas(obrigacoes: Registro[], cicloId: string) {
  const ordem: Record<string, number> = { [SITUACAO_OBRIGACAO.PENDENTE]: 0, [SITUACAO_OBRIGACAO.REVISAO]: 1, [SITUACAO_OBRIGACAO.DISPENSADA]: 2 }
  return obrigacoes.filter(o => o.ciclo_id === cicloId && o.situacao in ordem).sort((a, b) => ordem[a.situacao] - ordem[b.situacao])
}

/**
 * Escola do cadastro para uma lista do Presente (ADR 0007): mesmo CNPJ → usa; senão, uma única escola
 * sem CNPJ com o mesmo nome (ou apelido) → ganha o CNPJ; senão → cria. Sem CNPJ, a lista não é ligada.
 */
export function escolaDaLista(escolas: { id: string; nome: string; apelidos?: string | null; cnpj: string | null }[], nome: string, cnpj: string | null) {
  if (!cnpj) return { acao: 'nenhuma' as const }
  const mesma = escolas.find(e => e.cnpj === cnpj)
  if (mesma) return { acao: 'usar' as const, id: mesma.id }
  const k = chaveEscola(nome)
  const parecidas = escolas.filter(e => !e.cnpj && k && [e.nome, ...listaPipe(e.apelidos)].some(n => chaveEscola(n) === k))
  if (parecidas.length === 1) return { acao: 'completar' as const, id: parecidas[0].id }
  return { acao: 'criar' as const }
}
