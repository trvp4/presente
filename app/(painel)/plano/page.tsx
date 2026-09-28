import Link from 'next/link'
import { getStaff } from '@/lib/supabase/server'
import { statusOf, type Training } from '@/lib/format'
import { GRUPOS, grupoDoItem, participacao, sugestaoDeLista, type ItemPlano, type ListaLigada } from '@/lib/plano'
import { chavePatrocinador, listarPatrocinadores } from '@/lib/espacos/relatorio'
import { DateBox, Underline } from '@/components/ui'
import { Desligar, EditarItem, NovoItem, type Opcoes } from './Acoes'

export const metadata = { title: 'Plano de capacitações' }

const dia = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/')

export default async function Plano({ searchParams }: { searchParams: Promise<{ pat?: string }> }) {
  const { supabase } = await getStaff()
  const { pat } = await searchParams
  const [{ data: itensDb }, { data: projetos }, { data: escolas }, { data: listasDb }] = await Promise.all([
    supabase.from('plano_capacitacoes').select('*').order('data_prevista', { nullsFirst: false }),
    supabase.from('projects').select('id, name, pronac, archived').order('name'),
    supabase.from('schools').select('id, nome, cidade').order('nome'),
    supabase.from('trainings').select('id, title, school_id, beneficiary_name, date, start_time, end_time, state, keep_open_hours, attendances(count)').order('date', { ascending: false }),
  ])
  const todos = (itensDb ?? []) as ItemPlano[]
  const projeto = new Map((projetos ?? []).map(p => [p.id, p]))
  const escola = new Map((escolas ?? []).map(e => [e.id, e]))
  type Lista = Pick<Training, 'id' | 'title' | 'beneficiary_name' | 'date' | 'start_time' | 'end_time' | 'state' | 'keep_open_hours'> & { school_id: string | null; attendances: { count: number }[] }
  const listas = new Map(((listasDb ?? []) as unknown as (Lista & { school_id: string | null })[]).map(t => [t.id, {
    id: t.id, school_id: t.school_id, status: statusOf(t), presencas: t.attendances?.[0]?.count ?? 0, date: t.date, title: t.title, escola: t.beneficiary_name,
  }]))
  const ligadas = new Set(todos.map(i => i.training_id).filter((x): x is string => Boolean(x)))
  const livres: ListaLigada[] = [...listas.values()].filter(l => !ligadas.has(l.id))

  const pats = listarPatrocinadores(todos.map(i => ({ patrocinador: i.patrocinador, acompanhar: true })))
  const itens = pat ? todos.filter(i => chavePatrocinador(i.patrocinador) === pat) : todos
  const ativos = itens.filter(i => i.situacao !== 'cancelada')
  const conta = (g: string) => itens.filter(i => grupoDoItem(i) === g).length
  const confirmadas = ativos.filter(i => i.training_id && participacao(listas.get(i.training_id)) === 'confirmada').length

  const op: Opcoes = {
    projetos: (projetos ?? []).filter(p => !p.archived).map(p => ({ id: p.id, rotulo: p.name })),
    escolas: (escolas ?? []).map(e => ({ id: e.id, rotulo: e.cidade ? `${e.nome} · ${e.cidade}` : e.nome })),
    listasLivres: livres.map(l => ({ id: l.id, rotulo: `${dia(l.date)} · ${listas.get(l.id)!.title} · ${listas.get(l.id)!.escola ?? ''}` })),
  }

  return (
    <section className="view">
      <div className="head">
        <div>
          <span className="modchip presente"><i />Presente</span>
          <h1>Plano de <Underline>capacitações</Underline></h1>
          <p>O que está previsto por projeto e patrocinador. Crie a Lista de Presença a partir do plano: a presença assinada confirma a participação da escola.</p>
        </div>
        <div className="acts"><NovoItem op={op} /></div>
      </div>

      {pats.length > 1 && (
        <nav className="av-chips" aria-label="Filtrar por patrocinador">
          <Link className="chip" href="/plano" aria-pressed={!pat}>Todos · {todos.length}</Link>
          {pats.map(p => <Link key={p.chave} className="chip" href={`/plano?pat=${encodeURIComponent(p.chave)}`} aria-pressed={p.chave === pat}>{p.nome} · {p.vinculos}</Link>)}
        </nav>
      )}

      <div className="es-kpis">
        <div className="es-kpi"><b>{ativos.length}</b><span>no plano</span></div>
        <div className="es-kpi"><b>{conta('com-lista')}</b><span>com lista de presença</span></div>
        <div className="es-kpi" style={{ background: 'var(--pink)' }}><b>{confirmadas}</b><span>participação confirmada</span></div>
        <div className="es-kpi"><b>{conta('realizada-sem-lista')}</b><span>realizadas sem lista</span></div>
        <div className="es-kpi"><b>{conta('sem-data')}</b><span>sem data</span></div>
      </div>

      {!todos.length && <div className="empty"><span className="hand wipe">Plano vazio…</span><br />Acrescente a primeira capacitação acima.</div>}

      {GRUPOS.map(g => {
        const doGrupo = itens.filter(i => grupoDoItem(i) === g.id)
        if (!doGrupo.length) return null
        return (
          <section key={g.id}>
            <div className="sec-title"><h2>{g.titulo} <span className="mono" style={{ color: 'var(--muted)', fontSize: 14 }}>{doGrupo.length}</span></h2><span>{g.texto}</span></div>
            <div className="es-list">
              {doGrupo.map(i => {
                const p = projeto.get(i.project_id), e = i.school_id ? escola.get(i.school_id) : undefined
                const lista = i.training_id ? listas.get(i.training_id) : undefined
                const part = participacao(lista)
                const sug = sugestaoDeLista(i, livres, ligadas)
                const inicial = { project_id: i.project_id, school_id: i.school_id ?? '', patrocinador: i.patrocinador ?? '', tipo: i.tipo, cidade: i.cidade ?? '',
                  data_prevista: i.data_prevista ?? '', hora: i.hora ?? '', situacao: i.situacao, observacoes: i.observacoes ?? '' }
                return (
                  <div key={i.id} className="es-row" style={{ gridTemplateColumns: '52px minmax(0,1.4fr) minmax(0,1.2fr) auto' }}>
                    {i.data_prevista ? <DateBox iso={i.data_prevista} /> : <span className="st st-muted" style={{ justifySelf: 'start' }}>sem data</span>}
                    <div style={{ minWidth: 0 }}>
                      <div className="t">{i.tipo}{i.hora && <span className="s" style={{ fontWeight: 500 }}> · {i.hora}</span>}</div>
                      <div className="s">{[p?.name, i.patrocinador, i.cidade ?? e?.cidade, i.modo].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div className="hide-sm" style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{e?.nome ?? <span className="hand" style={{ fontSize: 19, color: 'var(--muted)' }}>instituição a definir</span>}</div>
                      <div className="s">{i.publico ?? i.observacoes ?? ''}</div>
                    </div>
                    {lista ? (
                      <div className="acts">
                        <span className={`st ${part === 'confirmada' ? 'st-ok' : part === 'sem presenças' ? 'st-pend' : 'st-sched'}`}>
                          {part === 'confirmada' ? `Presença confirmada · ${lista.presencas}` : part === 'sem presenças' ? 'Lista sem presenças' : `Lista de ${dia(lista.date)}`}
                        </span>
                        <Link className="btn btn-ghost btn-sm" href={`/listas/${lista.id}`}>Abrir lista</Link>
                        <Desligar id={i.id} />
                      </div>
                    ) : (
                      <div className="acts" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                        {i.situacao !== 'cancelada' && (p?.pronac
                          ? <Link className="btn btn-dark btn-sm" href={`/listas/nova?plano=${i.id}`}>Criar lista</Link>
                          : <span className="hint">Projeto sem Pronac: <Link href="/projetos">cadastre</Link> para criar a lista</span>)}
                        <EditarItem id={i.id} inicial={inicial} op={op} sugestao={sug ? { id: sug.id, rotulo: dia(sug.date) } : undefined} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </section>
  )
}
