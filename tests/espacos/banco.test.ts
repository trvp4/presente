import { describe, expect, it } from 'vitest'
import { paraRegras, linhasFechamento, cicloPadrao, obrigacoesAbertas, escolaDaLista } from '@/lib/espacos/banco'
import { processar } from '@/lib/espacos/regras'
import { montarRelatorioPatrocinador, textoRelatorio } from '@/lib/espacos/relatorio'

// Linhas como o Supabase devolve (uuid, null, timestamptz em texto)
const linhas = () => ({
  schools: [
    { id: 's1', nome: 'EMEF Pedro Bandeira', apelidos: null, cnpj: null, cidade: 'Recife – PE', situacao: 'ativa', contato_nome: null },
    { id: 's2', nome: 'EMEI Ziraldo', apelidos: null, cnpj: null, cidade: null, situacao: 'ativa', contato_nome: null },
    { id: 's3', nome: 'CEI Ana Maria Machado', apelidos: null, cnpj: null, cidade: null, situacao: 'ativa', contato_nome: null },
  ],
  projects: [{ id: 'p1', name: 'Cantos de Leitura 9º', nomes_no_formulario: null, archived: false }],
  vinculos: ['s1', 's2', 's3'].map((s, i) => ({ id: 'v' + (i + 1), school_id: s, project_id: 'p1', patrocinador: 'Aurora', inicio: '2026-01', fim: null, acompanhar: true })),
  ciclos: [{ id: '2026-08', prazo: null, situacao: 'encerrado' }],
  respostas: [{
    id: 'F-1', origem: 'formulário', hash_origem: 'h', carimbo: '2026-09-05T12:00:00.000Z', projeto_informado: 'Cantos de Leitura 9º',
    escola_informada: 'E.M.E.F. Pedro Bandeira', mes_informado: 'Agosto', visitas_texto: '120', emprestimos_texto: '40', atividades_texto: '6',
    vinculo_manual: null, mes_manual: null, visitas_corrigidas: null, emprestimos_corrigidos: null, eventos_corrigidos: null, decisao: null,
  }],
  dispensas: [{ ciclo_id: '2026-08', vinculo_id: 'v2', motivo: 'escola em reforma' }],
  contatos: [{ id: 'c1', ciclo_id: '2026-08', vinculo_id: 'v3', data: '2026-09-02T13:00:00.000Z', canal: 'WhatsApp', resultado: 'vai responder' }],
  fechamentos: [],
})

describe('Espaços de Leitura · banco → regras', () => {
  it('calcula obrigações, contatos e fechamento a partir das linhas do banco', () => {
    const r = processar(paraRegras(linhas()), new Date('2026-09-10T12:00:00Z'))
    const sit = Object.fromEntries(r.obrigacoes.map(o => [o.vinculo_id, o.situacao]))
    expect(sit).toEqual({ v1: 'respondida', v2: 'dispensada', v3: 'pendente' })
    expect(r.obrigacoes.find(o => o.vinculo_id === 'v3')!.ultimo_contato).toEqual(new Date('2026-09-02T13:00:00.000Z'))
    expect(r.ciclos[0]).toMatchObject({ esperadas: 2, respondidas: 1, dispensadas: 1, taxa_resposta: 0.5, visitas: 120 })

    const [f] = linhasFechamento(r.novosFechamentos)
    expect(f).toMatchObject({ ciclo_id: '2026-08', versao: 1, respondidas: 1, taxa_resposta: 0.5 })
    expect(typeof f.registrado_em).toBe('string')
  })

  it('projeto arquivado e escola inativa deixam de ser cobrados', () => {
    const l = linhas()
    l.projects[0].archived = true
    const r = processar(paraRegras(l), new Date('2026-09-10T12:00:00Z'))
    expect(r.obrigacoes.every(o => o.situacao === 'fora do ciclo' || o.situacao === 'dispensada')).toBe(true)
  })

  it('escolhe o ciclo aberto mais recente e ordena o que falta fazer', () => {
    expect(cicloPadrao([{ ciclo_id: '2026-07', situacao: 'aberto' }, { ciclo_id: '2026-09', situacao: 'encerrado' }, { ciclo_id: '2026-08', situacao: 'aberto' }])!.ciclo_id).toBe('2026-08')
    expect(cicloPadrao([{ ciclo_id: '2026-07', situacao: 'encerrado' }])!.ciclo_id).toBe('2026-07')
    const abertas = obrigacoesAbertas([
      { ciclo_id: '2026-08', situacao: 'dispensada' }, { ciclo_id: '2026-08', situacao: 'respondida' },
      { ciclo_id: '2026-08', situacao: 'pendente' }, { ciclo_id: '2026-07', situacao: 'pendente' },
    ], '2026-08')
    expect(abertas.map(o => o.situacao)).toEqual(['pendente', 'dispensada'])
  })
})

describe('Espaços de Leitura · escola de uma lista do Presente', () => {
  const escolas = [
    { id: 'a', nome: 'EMEF Pedro Bandeira', apelidos: null, cnpj: null },
    { id: 'b', nome: 'EMEI Ziraldo', apelidos: 'Escola Ziraldo', cnpj: '11222333000181' },
    { id: 'c', nome: 'CEI Ana Maria Machado', apelidos: null, cnpj: null },
    { id: 'd', nome: 'Escola Municipal Ana Maria Machado', apelidos: null, cnpj: null },
  ]
  it('usa a escola do mesmo CNPJ, completa a escola sem CNPJ de mesmo nome e cria nos outros casos', () => {
    expect(escolaDaLista(escolas, 'qualquer nome', '11222333000181')).toEqual({ acao: 'usar', id: 'b' })
    expect(escolaDaLista(escolas, 'E.M.E.F. Pedro Bandeira', '99888777000166')).toEqual({ acao: 'completar', id: 'a' })
    expect(escolaDaLista(escolas, 'Escola Nova', '99888777000166')).toEqual({ acao: 'criar' })
    expect(escolaDaLista(escolas, 'EMEF Pedro Bandeira', null)).toEqual({ acao: 'nenhuma' })
  })
})

describe('Espaços de Leitura · relatório com dados do banco', () => {
  it('escola fora do acompanhamento mensal (acompanhar = false) aparece como ponto de atenção legível', () => {
    const l = linhas()
    l.vinculos[2].acompanhar = false
    const e = paraRegras(l)
    const r = processar(e, new Date('2026-09-10T12:00:00Z'))
    const rel = montarRelatorioPatrocinador({ ...e, ciclos: r.ciclos, obrigacoes: r.obrigacoes, respostas: r.respostas }, 'AURORA', '2026-08', '2026-08')
    expect(rel.acompanhadas).toBe(2)
    expect(rel.atencao).toContain('CEI Ana Maria Machado (Cantos de Leitura 9º): fora do acompanhamento mensal no cadastro — confirmar se deve ser cobrada')
  })
})

describe('Espaços de Leitura · dados pessoais no relatório', () => {
  it('o relatório (e o texto copiado) não leva nome nem telefone do contato da escola', () => {
    const l = linhas()
    Object.assign(l.schools[2], { contato_nome: 'Diretora Fulana', telefone: '(81) 99999-0000' })
    l.ciclos = [{ id: '2026-07', prazo: null, situacao: 'aberto' }, { id: '2026-08', prazo: null, situacao: 'aberto' }]
    l.contatos = []
    const e = paraRegras(l)
    const r = processar(e, new Date('2026-09-10T12:00:00Z'))
    const rel = montarRelatorioPatrocinador({ ...e, ciclos: r.ciclos, obrigacoes: r.obrigacoes, respostas: r.respostas }, 'AURORA', '2026-07', '2026-08')
    expect(rel.atencao.some(a => a.includes('2 meses seguidos'))).toBe(true)
    expect(textoRelatorio(rel)).not.toMatch(/99999|Fulana/)
  })
})
