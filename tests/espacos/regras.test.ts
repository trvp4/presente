// Porte de Nath-Automacao/tests/sincronizacao.test.js: cada teste é um critério de
// "Como verificar que está pronto" do documento original.
import { describe, expect, it } from 'vitest'
import { ESCOLAS, TITULOS_FORM, cenarioBase, ciclo, enviar, envio, obrig, sincronizar } from './cenario'

describe('Espaços de Leitura · ciclo mensal', () => {
  it('exemplo do documento: Jardim das Letras envia agosto → 6 respondidas, 2 pendentes, 75%', () => {
    const e = cenarioBase()
    sincronizar(e)
    let c = ciclo(e)
    expect([c.esperadas, c.respondidas, c.pendentes]).toEqual([8, 5, 3])

    enviar(e, envio({ quando: '2026-09-10T09:00:00-03:00', escola: 'Escola Jardim das Letras', mes: 'Agosto',
      visitas: 'Total de visitas no mês: 120 Média diária de visitas: 6',
      emprestimos: 'Total de livros emprestados no mês: 32', atividades: 'Total de eventos/atividades: 4' }))
    sincronizar(e)

    c = ciclo(e)
    expect([c.respondidas, c.pendentes, c.taxa_resposta]).toEqual([6, 2, 0.75])
    const r = e.respostas.find(x => x.vinculo_id === 'V1')!
    expect(r.situacao).toBe('válida')
    expect([r.total_visitas, r.media_diaria, r.total_emprestimos, r.total_eventos]).toEqual([120, 6, 32, 4])
    expect(r.fora_cronograma, 'pergunta "além do cronograma" não pode ser confundida com a de atividades').toBe('Não')
    expect(obrig(e, '2026-08|V1')!.situacao).toBe('respondida')
    expect(c.visitas).toBe(101 + 102 + 103 + 104 + 105 + 120)
  })

  it('processar duas vezes sem mudança não altera nada', () => {
    const e = cenarioBase()
    sincronizar(e)
    const foto = JSON.stringify([e.respostas, e.obrigacoes, e.ciclos])
    sincronizar(e)
    expect(JSON.stringify([e.respostas, e.obrigacoes, e.ciclos])).toBe(foto)
  })

  it('reenvio: vale o mais recente, o anterior fica guardado e os totais não inflam', () => {
    const e = cenarioBase()
    sincronizar(e)
    const antes = { ...ciclo(e) }
    enviar(e, envio({ quando: '2026-09-15T10:00:00-03:00', escola: 'EMEF Monteiro Lobato', mes: 'agosto',
      visitas: 'Total de visitas no mês: 150', emprestimos: '10', atividades: '1' }))
    sincronizar(e)
    const depois = ciclo(e)
    expect(depois.respondidas).toBe(antes.respondidas)
    expect(depois.visitas).toBe(antes.visitas - 101 + 150)
    const doV2 = e.respostas.filter(r => r.vinculo_id === 'V2')
    expect(doV2.map(r => r.situacao).sort()).toEqual(['substituída', 'válida'])
    expect(doV2.find(r => r.vigente === true)!.total_visitas).toBe(150)
  })

  it('resposta de escola desconhecida vai para revisão; vínculo manual resolve', () => {
    const e = cenarioBase()
    enviar(e, envio({ quando: '2026-09-12T10:00:00-03:00', escola: 'Esc. Pedrinho Bandeira', mes: 'Agosto', visitas: '80', emprestimos: '5', atividades: '2' }))
    sincronizar(e)
    const r = e.respostas.find(x => x.escola_informada === 'Esc. Pedrinho Bandeira')!
    expect(r.situacao).toBe('em revisão')
    expect(r.motivos).toMatch(/escola não identificada/)
    expect(obrig(e, '2026-08|V8')!.situacao).toBe('pendente')

    // a Equipe corrige na revisão
    r.vinculo_manual = 'V8'
    r.nota_revisao = 'é a EMEF Pedro Bandeira'
    sincronizar(e)
    expect(r.situacao).toBe('válida')
    expect(r.nota_revisao, 'anotação da Equipe preservada').toBe('é a EMEF Pedro Bandeira')
    expect(obrig(e, '2026-08|V8')!.situacao).toBe('respondida')
  })

  it('zero informado, campo vazio e texto ilegível são diferentes', () => {
    const e = cenarioBase()
    enviar(e, envio({ quando: '2026-09-12T10:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto',
      visitas: 'nenhuma', emprestimos: '', atividades: 'fizemos várias rodas de leitura com as turmas' }))
    sincronizar(e)
    const r = e.respostas.find(x => x.vinculo_auto === 'V8')!
    expect([r.total_visitas, r.visitas_estado, r.emprestimos_estado, r.eventos_estado]).toEqual([0, 'informado', 'vazio', 'não lido'])
    expect(r.situacao).toBe('em revisão')
    expect(obrig(e, '2026-08|V8')!.situacao).toBe('em revisão')

    // a Equipe informa o número correto
    r.eventos_corrigidos = 3
    sincronizar(e)
    expect([r.total_eventos, r.eventos_estado, r.situacao]).toEqual([3, 'corrigido', 'válida'])
  })

  it('mês de referência vem da resposta, não da data de envio', () => {
    const e = cenarioBase()
    enviar(e, envio({ quando: '2027-01-05T10:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Dezembro', visitas: '10', emprestimos: '1', atividades: '1' }))
    sincronizar(e)
    expect(e.respostas.find(x => x.vinculo_auto === 'V8')!.mes).toBe('2026-12')
  })

  it('pendência só para quem precisa responder: fora do período e dispensa', () => {
    const e = cenarioBase()
    e.vinculos.find(v => v.vinculo_id === 'V7')!.fim = '2026-07'
    sincronizar(e)
    expect(obrig(e, '2026-08|V7'), 'vínculo encerrado em julho não gera obrigação em agosto').toBeUndefined()
    expect(ciclo(e).esperadas).toBe(7)

    obrig(e, '2026-08|V8')!.dispensa = 'sim'
    sincronizar(e)
    expect(obrig(e, '2026-08|V8')!.situacao).toBe('dispensada')
    expect([ciclo(e).esperadas, ciclo(e).dispensadas]).toEqual([6, 1])
  })

  it('ciclo encerrado guarda versão; mudança posterior gera nova versão', () => {
    const e = cenarioBase()
    sincronizar(e)
    ciclo(e).situacao = 'encerrado'
    sincronizar(e)
    sincronizar(e)
    expect(e.fechamentos.length).toBe(1)
    expect(e.fechamentos[0].respondidas).toBe(5)

    enviar(e, envio({ quando: '2026-09-20T10:00:00-03:00', escola: 'EMEF Pedro Bandeira', mes: 'Agosto', visitas: '10', emprestimos: '1', atividades: '1' }))
    sincronizar(e)
    expect(e.fechamentos.length).toBe(2)
    expect([e.fechamentos[1].versao, e.fechamentos[1].respondidas, ciclo(e).versao_resultado]).toEqual([2, 6, 2])
  })
})

// Substituem os testes da aba do Forms (ordenar/apagar linhas): agora cada envio chega sozinho ao hub.
describe('Espaços de Leitura · envio do Google Forms chegando ao hub', () => {
  it('o mesmo envio recebido duas vezes não duplica', () => {
    const e = cenarioBase()
    const linha = envio({ quando: '2026-09-10T09:00:00-03:00', escola: ESCOLAS[0], mes: 'Agosto', visitas: '120' })
    expect(enviar(e, linha).acao).toBe('nova')
    expect(enviar(e, linha).acao).toBe('igual')
    expect(e.respostas.length).toBe(6)
  })

  it('envio editado pela escola atualiza a resposta e preserva a revisão da Equipe', () => {
    const e = cenarioBase()
    const linha = envio({ quando: '2026-09-10T09:00:00-03:00', escola: ESCOLAS[0], mes: 'Agosto', visitas: '120' })
    const r = enviar(e, linha).resposta!
    r.nota_revisao = 'conferido por telefone'
    linha[9] = '130'
    expect(enviar(e, linha).acao).toBe('editada')
    sincronizar(e)
    expect([r.total_visitas, r.nota_revisao]).toEqual([130, 'conferido por telefone'])
  })

  it('formulário com perguntas essenciais renomeadas: recusa e avisa, sem gravar nada', () => {
    const e = cenarioBase()
    const titulos = [...TITULOS_FORM]
    titulos[3] = 'Nome da escola'
    const r = enviar(e, envio({ quando: '2026-09-10T09:00:00-03:00', escola: ESCOLAS[0], mes: 'Agosto' }), titulos)
    expect(r.acao).toBe('recusada')
    expect(r.motivo).toMatch(/perguntas do formulário não encontradas: escola_informada/)
    expect(e.respostas.length).toBe(5)
  })
})
