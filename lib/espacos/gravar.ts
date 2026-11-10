// Espaços de Leitura · grava uma resposta do formulário em el_respostas (vinda do script do Forms ou da planilha).
// Idempotente: o mesmo envio não duplica, e uma edição da escola atualiza só o conteúdo original
// (a revisão da Equipe fica). Os derivados são calculados na leitura.
import type { SupabaseClient } from '@supabase/supabase-js'
import { linhaDaResposta } from './formulario'
import { PERGUNTAS_ESSENCIAIS, mapearPerguntas, respostaDoFormulario } from './regras'

export type Envio = { titulos: string[]; valores: string[]; referencia: string }
export type Resultado =
  | { acao: 'nova' | 'editada' | 'igual'; id: string }
  | { acao: 'recusada'; motivo: string }
  | { acao: 'erro'; erro: string }

/** Grava um envio. `hashes` (id → hash_origem já gravado) evita uma consulta por resposta numa leitura em lote. */
export async function gravarResposta(admin: SupabaseClient, envio: Envio, hashes?: Map<string, string>): Promise<Resultado> {
  const { mapa, faltando } = mapearPerguntas(envio.titulos)
  const essenciais = PERGUNTAS_ESSENCIAIS.filter(c => faltando.includes(c))
  if (essenciais.length) return { acao: 'recusada', motivo: `perguntas do formulário não encontradas: ${essenciais.join(', ')} (o formulário mudou?)` }

  const linha = linhaDaResposta(respostaDoFormulario(envio.valores, mapa, envio.referencia))
  const id = String(linha.id)
  const atual = hashes
    ? (hashes.has(id) ? { hash_origem: hashes.get(id) } : null)
    : (await admin.from('el_respostas').select('hash_origem').eq('id', id).maybeSingle()).data
  if (atual?.hash_origem === linha.hash_origem) return { acao: 'igual', id }
  if (atual) {
    const { error } = await admin.from('el_respostas').update(linha).eq('id', id)
    if (error) return { acao: 'erro', erro: 'não foi possível atualizar a resposta' }
    hashes?.set(id, String(linha.hash_origem))
    return { acao: 'editada', id }
  }
  const { error } = await admin.from('el_respostas').insert(linha)
  if (error?.code === '23505') return { acao: 'igual', id } // mesmo envio chegando duas vezes ao mesmo tempo
  if (error) return { acao: 'erro', erro: 'não foi possível gravar a resposta' }
  hashes?.set(id, String(linha.hash_origem))
  return { acao: 'nova', id }
}
