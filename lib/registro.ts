// Registro de acesso (LGPD): quem baixou ou abriu dados com CPF completo, removeu assinatura ou excluiu lista.
// Só acrescenta (a tabela não permite editar nem apagar). Falhar ao registrar não impede a ação: vai para o log.
import type { SupabaseClient } from '@supabase/supabase-js'

export const ACOES = {
  documento: 'baixou o documento em Word',
  planilha: 'baixou a planilha',
  impressao: 'abriu a versão para imprimir',
  remocao_assinatura: 'removeu uma assinatura',
  exclusao_lista: 'excluiu a lista',
} as const
export type Acao = keyof typeof ACOES

/** Linha do registro. O título da lista vai junto para o registro valer mesmo depois de a lista ser excluída. */
export function linhaDoRegistro(quem: string, acao: Acao, lista: { id: string; title: string }, detalhe?: string) {
  if (!(acao in ACOES)) throw new Error('Ação de registro desconhecida: ' + acao)
  return {
    quem: quem.trim().toLowerCase(),
    acao,
    training_id: lista.id,
    lista_titulo: lista.title.slice(0, 200),
    detalhe: detalhe ? detalhe.slice(0, 300) : null,
  }
}

export async function registrar(supabase: SupabaseClient, quem: string | null, acao: Acao, lista: { id: string; title: string }, detalhe?: string) {
  const { error } = await supabase.from('registro_acesso').insert(linhaDoRegistro(quem ?? 'desconhecido', acao, lista, detalhe))
  if (error) console.error(`registro_acesso: não gravou "${acao}" da lista ${lista.id}: ${error.message}`)
}
