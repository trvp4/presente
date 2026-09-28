import { describe, expect, it } from 'vitest'
import { ACOES, linhaDoRegistro } from '@/lib/registro'
import { SESSAO_SEGUNDOS } from '@/lib/supabase/sessao'

describe('Registro de acesso (LGPD)', () => {
  it('guarda quem, a ação e o título da lista (para valer depois de a lista ser excluída)', () => {
    expect(linhaDoRegistro(' Maria@Presente.app ', 'documento', { id: 't1', title: 'Mediação de leitura' })).toEqual({
      quem: 'maria@presente.app', acao: 'documento', training_id: 't1', lista_titulo: 'Mediação de leitura', detalhe: null,
    })
    expect(linhaDoRegistro('a@b.c', 'remocao_assinatura', { id: 't1', title: 'x' }, 'assinatura de Fulana').detalhe).toBe('assinatura de Fulana')
  })

  it('recusa ação fora da lista e corta textos longos', () => {
    expect(() => linhaDoRegistro('a@b.c', 'apagou_tudo' as never, { id: 't1', title: 'x' })).toThrow()
    expect(linhaDoRegistro('a@b.c', 'planilha', { id: 't1', title: 'x'.repeat(500) }).lista_titulo).toHaveLength(200)
    expect(Object.keys(ACOES)).toEqual(['documento', 'planilha', 'impressao', 'remocao_assinatura', 'exclusao_lista'])
  })
})

describe('Sessão da Equipe', () => {
  it('expira depois de 12 horas sem uso', () => {
    expect(SESSAO_SEGUNDOS).toBe(12 * 60 * 60)
  })
})
