import Link from 'next/link'
import { getStaff } from '@/lib/supabase/server'
import { statusOf, todayISO, type Training } from '@/lib/format'
import { carregarEspacos, cicloPadrao } from '@/lib/espacos/banco'
import { grupoDoItem } from '@/lib/plano'
import { rotuloMes } from '@/lib/espacos/normalizacao'
import { Icone, Underline } from '@/components/ui'
import { num } from './espacos/ui'

export const metadata = { title: 'Central' }

// Central: duas portas, cada uma com os próprios números e pendências (sem lista de tarefas misturada).
export default async function Central() {
  const { supabase, name } = await getStaff()
  const [{ data }, es, { data: plano }] = await Promise.all([
    supabase.from('trainings').select('date, start_time, end_time, state, keep_open_hours, pdf_sent_at'),
    carregarEspacos(supabase).catch(() => null), // se o Espaços falhar, a porta do Presente continua de pé
    supabase.from('plano_capacitacoes').select('situacao, training_id, data_prevista'),
  ])
  const grupos = (plano ?? []).map(i => grupoDoItem(i as Parameters<typeof grupoDoItem>[0]))
  const listas = (data ?? []) as Pick<Training, 'date' | 'start_time' | 'end_time' | 'state' | 'keep_open_hours' | 'pdf_sent_at'>[]
  const st = listas.map(t => ({ t, s: statusOf(t) }))
  const semana = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  const ciclo = es ? cicloPadrao(es.ciclos) : null
  const pendentes = ciclo && es ? es.obrigacoes.filter(o => o.ciclo_id === ciclo.ciclo_id && o.situacao === 'pendente').length : 0
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })
  const seta = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>

  return (
    <section className="view">
      <div className="head">
        <div>
          <h1>Olá, <Underline>{(name ?? 'equipe').split(' ')[0]}</Underline></h1>
          <p>{hoje} · escolha em que você vai trabalhar agora.</p>
        </div>
      </div>

      <div className="doors">
        <Link className="door presente" href="/listas">
          <div className="top"><span className="ic"><Icone nome="listas" size={22} /></span><span className="enter">Entrar {seta}</span></div>
          <div><h2>Presente</h2><p className="what">Listas de presença das capacitações, com assinatura pelo celular e o documento para a prestação de contas.</p></div>
          <div className="nums">
            <div><b>{st.filter(x => x.s !== 'done').length}</b><span>acontecendo ou próximas</span></div>
            <div><b>{st.filter(x => x.s === 'done').length}</b><span>encerradas</span></div>
          </div>
          <div className="todo-mini">
            <div><span>Encerradas com documento a enviar</span><b>{st.filter(x => x.s === 'done' && !x.t.pdf_sent_at).length}</b></div>
            <div><span>Nos próximos 7 dias</span><b>{st.filter(x => x.s === 'sched' && x.t.date <= semana && x.t.date >= todayISO()).length}</b></div>
            <div><span>Plano: realizadas sem lista</span><b>{grupos.filter(g => g === 'realizada-sem-lista').length}</b></div>
            <div><span>Plano: ainda sem data</span><b>{grupos.filter(g => g === 'sem-data').length}</b></div>
          </div>
        </Link>

        <Link className="door espacos" href="/espacos">
          <div className="top"><span className="ic"><Icone nome="livro" size={22} /></span><span className="enter">Entrar {seta}</span></div>
          <div><h2>Espaços de Leitura</h2><p className="what">Acompanhamento mensal das escolas que receberam os espaços: quem respondeu o formulário, quem falta, revisão e relatórios.</p></div>
          <div className="nums">
            {ciclo
              ? <div><b>{num(ciclo.respondidas)}/{num(ciclo.esperadas)}</b><span>responderam {rotuloMes(ciclo.ciclo_id)}</span></div>
              : <div><b>—</b><span>nenhum mês aberto</span></div>}
            <div><b>{es?.patrocinadores.length ?? '—'}</b><span>patrocinadores</span></div>
          </div>
          <div className="todo-mini">
            <div><span>Respostas para revisar</span><b>{es?.revisao.length ?? '—'}</b></div>
            <div><span>Escolas sem responder{ciclo ? ` ${rotuloMes(ciclo.ciclo_id)}` : ''}</span><b>{pendentes}</b></div>
          </div>
        </Link>
      </div>

      <div className="shared">
        <Icone nome="escolas" size={18} />
        <span><b>Os dois usam o mesmo cadastro de escolas e projetos.</b> Cada um tem seu menu e suas tarefas; o cruzamento aparece só onde ajuda e sempre sinalizado, como a etiqueta <span className="from">vindo do Presente</span> no relatório do patrocinador.</span>
      </div>
    </section>
  )
}
