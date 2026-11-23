// Saúde do sistema (tela /saude): regras das verificações de hora em hora e dos achados.
// Módulo puro: quem busca os dados é lib/saude-coletar.ts; quem mostra é app/(painel)/saude.
import { statusOf, type Training } from './format'

export type Status = 'ok' | 'atencao' | 'falha'
export type Gravidade = 'P1' | 'P2' | 'P3'
export type Achado = { gravidade: Gravidade; titulo: string; detalhe: string; categoria: string; acao: string }
export type Verificacao = { chave: string; nome: string; status: Status; valor: string; detalhe?: string; achado?: Achado }

export type Dados = {
  agora: Date
  banco: { ok: boolean; ms: number | null }
  rodadaAnterior: string | null // última conferência gravada antes desta
  listas: (Pick<Training, 'date' | 'start_time' | 'end_time' | 'state' | 'keep_open_hours' | 'open_until' | 'pdf_sent_at'> & { id: string; title: string })[]
  espacos: { planilhaConfigurada: boolean; ultimaResposta: string | null; revisao: number; pendentesMes: number; mes: string | null } | null
  ultimaAvaliacao: string | null
  ultimoBackup: string | null
}

const DIA = 864e5
const dias = (de: string | null, ate: Date) => (de ? Math.floor((ate.getTime() - new Date(de).getTime()) / DIA) : null)
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
const haDias = (n: number | null) => (n === null ? 'nunca' : n === 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`)
const dataBr = (iso: string) => iso.split('-').reverse().join('/')

/** Todas as verificações, na ordem da tela. */
export function verificar(d: Dados): Verificacao[] {
  const v: Verificacao[] = []

  v.push(d.banco.ok
    ? { chave: 'banco', nome: 'Banco de dados', status: 'ok', valor: `${d.banco.ms ?? '—'} ms` }
    : { chave: 'banco', nome: 'Banco de dados', status: 'falha', valor: 'fora do ar',
        achado: { gravidade: 'P1', categoria: 'Operação', titulo: 'O site não alcança o banco de dados',
          detalhe: 'Nada carrega para a Equipe e o voluntário não consegue assinar.', acao: 'Ver no painel do Supabase se o projeto está pausado e restaurar.' } })

  const horas = d.rodadaAnterior ? (d.agora.getTime() - new Date(d.rodadaAnterior).getTime()) / 3600e3 : 0
  v.push(horas > 2
    ? { chave: 'tarefa', nome: 'Tarefa de hora em hora', status: 'atencao', valor: `parada há ${Math.floor(horas)} h`,
        achado: { gravidade: 'P2', categoria: 'Operação', titulo: 'A tarefa de hora em hora parou',
          detalhe: `A última conferência automática foi há ${Math.floor(horas)} horas. Sem ela, a planilha não é lida e o banco pode pausar.`, acao: 'Ver os registros do worker na Cloudflare (Workers → presente → Logs).' } }
    : { chave: 'tarefa', nome: 'Tarefa de hora em hora', status: 'ok', valor: d.rodadaAnterior ? 'rodando' : 'primeira conferência' })

  const paradas = d.listas.filter(t => t.state === 'open' && (dias(t.date, d.agora) ?? 0) > 7)
  v.push(paradas.length
    ? { chave: 'listas_abertas', nome: 'Listas abertas além do prazo', status: 'atencao', valor: plural(paradas.length, 'lista', 'listas'),
        achado: { gravidade: 'P2', categoria: 'Listas', titulo: `Lista aberta há mais de 7 dias: ${paradas.map(t => t.title).join(', ')}`,
          detalhe: 'Foi aberta à mão e continua recebendo assinaturas.', acao: 'Abrir a lista em Listas e desligar "Aceitando presenças".' } }
    : { chave: 'listas_abertas', nome: 'Listas abertas além do prazo', status: 'ok', valor: 'nenhuma' })

  const esquecidas = d.listas.filter(t => !t.pdf_sent_at && statusOf(t, d.agora) === 'done' && (dias(t.date, d.agora) ?? 0) > 7)
  v.push(esquecidas.length
    ? { chave: 'documentos', nome: 'Documentos a enviar', status: 'atencao', valor: plural(esquecidas.length, 'lista', 'listas'),
        detalhe: esquecidas.map(t => `${t.title} (${dataBr(t.date)})`).join(', '),
        achado: { gravidade: 'P3', categoria: 'Listas', titulo: `${plural(esquecidas.length, 'lista encerrada', 'listas encerradas')} há mais de 7 dias sem documento enviado`,
          detalhe: esquecidas.map(t => `${t.title} (${dataBr(t.date)})`).join(', '), acao: 'Baixar o Word da lista, enviar e marcar "documento enviado".' } }
    : { chave: 'documentos', nome: 'Documentos a enviar', status: 'ok', valor: 'em dia' })

  if (d.espacos) {
    const e = d.espacos, semResposta = dias(e.ultimaResposta, d.agora)
    v.push(!e.planilhaConfigurada && (semResposta === null || semResposta > 30)
      ? { chave: 'formulario', nome: 'Formulário do Espaços de Leitura', status: 'atencao', valor: `última resposta ${haDias(semResposta)}`,
          achado: { gravidade: 'P2', categoria: 'Espaços de Leitura', titulo: 'As respostas do formulário mensal não estão chegando',
            detalhe: `A última resposta chegou ${haDias(semResposta)} e a planilha do formulário ainda não está ligada ao Presente.`,
            acao: 'Rodar npm run assistente -- google e pedir à Natália para compartilhar a planilha.' } }
      : { chave: 'formulario', nome: 'Formulário do Espaços de Leitura', status: 'ok', valor: `última resposta ${haDias(semResposta)}` })
    v.push(e.revisao
      ? { chave: 'revisao', nome: 'Respostas para revisar', status: 'atencao', valor: plural(e.revisao, 'resposta', 'respostas'),
          achado: { gravidade: 'P3', categoria: 'Espaços de Leitura', titulo: `${plural(e.revisao, 'resposta do Espaços de Leitura espera', 'respostas do Espaços de Leitura esperam')} revisão`,
            detalhe: 'As regras não conseguiram ligar a resposta à escola ou ao mês sozinhas.', acao: 'Revisar em Espaços de Leitura → Revisão.' } }
      : { chave: 'revisao', nome: 'Respostas para revisar', status: 'ok', valor: 'nenhuma' })
    v.push({ chave: 'pendentes', nome: 'Escolas sem responder', status: e.pendentesMes ? 'atencao' : 'ok',
      valor: e.pendentesMes ? plural(e.pendentesMes, 'escola', 'escolas') : 'nenhuma', detalhe: e.mes ? `mês de referência ${e.mes.split('-').reverse().join('/')}` : undefined })
  }

  v.push({ chave: 'avaliacoes', nome: 'Avaliações da formação', status: 'ok', valor: `última ${haDias(dias(d.ultimaAvaliacao, d.agora))}` })

  const idade = dias(d.ultimoBackup, d.agora)
  const acaoBackup = 'Rodar npm run backup e guardar o arquivo em local protegido (contém CPFs).'
  v.push(idade === null || idade > 7
    ? { chave: 'backup', nome: 'Backup completo', status: idade !== null && idade > 14 ? 'falha' : 'atencao', valor: haDias(idade),
        achado: { gravidade: idade !== null && idade > 14 ? 'P1' : 'P2', categoria: 'Dados',
          titulo: idade === null ? 'Nenhum backup completo registrado' : `O último backup completo tem ${idade} dias`, detalhe: 'Meta: um backup completo por semana.', acao: acaoBackup } }
    : { chave: 'backup', nome: 'Backup completo', status: 'ok', valor: haDias(idade) })

  return v
}

export type AchadoAtual = { id: string; estado: string; origem: string; verificacao: string | null }
export type AchadoNovo = Achado & { id: string; verificacao: string }

/** Abre um achado por verificação com problema (sem duplicar nem reabrir o ignorado) e resolve os que voltaram ao normal. */
export function planoDeAchados(verificacoes: Verificacao[], atuais: AchadoAtual[]) {
  const porId = new Map(atuais.map(a => [a.id, a]))
  const abrir: AchadoNovo[] = []
  for (const v of verificacoes) {
    if (!v.achado) continue
    const id = `ACH-${v.chave}`, atual = porId.get(id)
    if (atual && atual.estado !== 'resolvido') continue // aberto, aguardando ou ignorado: fica como está
    abrir.push({ ...v.achado, id, verificacao: v.chave })
  }
  const comProblema = new Set(verificacoes.filter(v => v.achado).map(v => v.chave))
  const resolver = atuais
    .filter(a => a.origem === 'verificacao' && (a.estado === 'aberto' || a.estado === 'aguarda_voce') && a.verificacao && !comProblema.has(a.verificacao))
    .map(a => a.id)
  return { abrir, resolver }
}

type Rodada = { quando: string; resultado: { chave: string; status: string }[] }

/** Números da tela: % de conferências com o banco ok e, por dia (30 dias), o maior número de verificações com problema. */
export function resumoDasRodadas(rodadas: Rodada[], agora: Date) {
  const diaBr = (iso: string | Date) => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10)
  const noAr = rodadas.length ? rodadas.filter(r => r.resultado.find(x => x.chave === 'banco')?.status === 'ok').length / rodadas.length : null
  const maxPorDia = new Map<string, number>()
  for (const r of rodadas) {
    const n = r.resultado.filter(x => x.status !== 'ok').length
    const d = diaBr(r.quando)
    maxPorDia.set(d, Math.max(maxPorDia.get(d) ?? 0, n))
  }
  const porDia = Array.from({ length: 30 }, (_, i) => {
    const dia = diaBr(new Date(agora.getTime() - (29 - i) * DIA))
    return { dia, problemas: maxPorDia.has(dia) ? maxPorDia.get(dia)! : null }
  })
  return { noAr, porDia }
}
