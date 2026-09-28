import Link from 'next/link'
import { getStaff } from '@/lib/supabase/server'
import { carregarEspacos } from '@/lib/espacos/banco'
import { chavePatrocinador, montarRelatorioPatrocinador, textoRelatorio } from '@/lib/espacos/relatorio'
import { ehMesIso } from '@/lib/espacos/normalizacao'
import { statusOf, todayISO, type Training } from '@/lib/format'
import { CopyButton } from '@/components/client'
import { Cabecalho, num, pct } from '../ui'

export const metadata = { title: 'Relatórios · Espaços de Leitura' }

const CEL: Record<string, [string, string]> = {
  'respondida': ['resp', 'c-resp'], 'em revisão': ['rev', 'c-rev'], 'pendente': ['pend', 'c-pend'], 'dispensada': ['disp', 'c-disp'], 'não esperada': ['—', ''],
}
const MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function mesesAtras(iso: string, n: number) {
  const [a, m] = iso.split('-').map(Number), t = a * 12 + m - 1 - n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ p?: string; de?: string; ate?: string }> }) {
  const { supabase } = await getStaff()
  const es = await carregarEspacos(supabase)
  const q = await searchParams
  const pats = [...es.patrocinadores].sort((a, b) => b.acompanhados - a.acompanhados || a.nome.localeCompare(b.nome))
  const cab = <Cabecalho titulo="Relatório por patrocinador" texto="Documento interno: uso dos espaços, escolas mês a mês e o que as escolas relataram." />
  if (!pats.length)
    return <section className="view">{cab}<div className="empty"><span className="hand wipe">Nenhum patrocinador ainda…</span><br />Os patrocinadores vêm do cadastro de escolas (cada escola em acompanhamento tem o seu).</div></section>

  const pat = pats.find(p => p.chave === q.p) ?? pats[0]
  const ate = ehMesIso(q.ate) ? q.ate! : todayISO().slice(0, 7)
  // padrão: desde a resposta mais antiga (o histórico das planilhas) ou os últimos 12 meses, o que vier antes
  const maisAntiga = es.respostas.map(r => String(r.mes)).filter(ehMesIso).sort()[0]
  const padrao = maisAntiga && maisAntiga < mesesAtras(ate, 11) ? maisAntiga : mesesAtras(ate, 11)
  const de = ehMesIso(q.de) && q.de! <= ate ? q.de! : padrao
  const r = montarRelatorioPatrocinador(
    { escolas: es.estado.escolas, projetos: es.estado.projetos, vinculos: es.estado.vinculos, ciclos: es.ciclos, obrigacoes: es.obrigacoes, respostas: es.respostas },
    pat.chave, de, ate,
  )
  const s = r.resumo
  const meses = r.meses.filter(m => r.grade.some(g => g.meses[m.id]))

  // Capacitações do Presente nos projetos deste patrocinador
  const projetoIds = [...new Set(es.estado.vinculos.filter(v => r.grade.some(g => g.vinculo === v.vinculo_id)).map(v => v.projeto_id))]
  const { data: caps } = projetoIds.length
    ? await supabase.from('trainings').select('id, title, date, start_time, end_time, state, keep_open_hours, beneficiary_name, attendances(count)').in('project_id', projetoIds).gte('date', `${de}-01`).order('date')
    : { data: [] }
  // Plano de capacitações deste patrocinador (o plano já diz o patrocinador de cada capacitação)
  const { data: planoDb } = await supabase.from('plano_capacitacoes')
    .select('id, tipo, patrocinador, data_prevista, situacao, cidade, training_id, school:schools(nome), training:trainings(date, attendances(count))')
    .order('data_prevista', { nullsFirst: false })
  type ItemRel = { id: string; tipo: string; patrocinador: string | null; data_prevista: string | null; situacao: string; cidade: string | null; training_id: string | null
    school: { nome: string } | null; training: { date: string; attendances: { count: number }[] } | null }
  const planoPat = ((planoDb ?? []) as unknown as ItemRel[]).filter(i => chavePatrocinador(i.patrocinador) === pat.chave && i.situacao !== 'cancelada')

  return (
    <section className="view">
      {cab}
      <form className="es-form card" method="get">
        <div className="f"><label htmlFor="p">Patrocinador</label>
          <select id="p" name="p" defaultValue={pat.chave}>
            {pats.map(p => <option key={p.chave} value={p.chave}>{p.nome} · {p.vinculos} escola{p.vinculos === 1 ? '' : 's'}</option>)}
          </select></div>
        <div className="f curto"><label htmlFor="de">De</label><input id="de" name="de" type="month" defaultValue={de} /></div>
        <div className="f curto"><label htmlFor="ate">Até</label><input id="ate" name="ate" type="month" defaultValue={ate} /></div>
        <button className="btn btn-dark btn-sm">Ver relatório</button>
        <CopyButton text={textoRelatorio(r)} className="btn btn-ghost btn-sm" label="Copiar como texto" />
      </form>

      <header className="es-rel-head">
        <div>
          <span className="lbl" style={{ color: '#9A9A9A' }}>Relatório interno · uso da equipe</span>
          <h2>{r.patrocinador}</h2>
          <p>{r.periodo} · {r.projetos.join(', ')}</p>
        </div>
        <span className="st st-lilac">gerado em {r.gerado_em}</span>
      </header>

      <div className="es-kpis" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
        <div className="es-kpi"><b>{r.acompanhadas}/{r.escolas}</b><span>escolas em acompanhamento</span></div>
        <div className="es-kpi"><b>{s.respondidas}/{s.esperadas}</b><span>respostas esperadas</span></div>
        <div className="es-kpi lilac"><b>{pct(s.taxa)}</b><span>taxa de resposta</span></div>
        <div className="es-kpi"><b>{s.com_visitas ? num(s.visitas) : '—'}</b><span>{s.com_visitas ? `visitas (${s.com_visitas} de ${s.respostas_validas} informaram)` : 'visitas: sem informação'}</span></div>
      </div>

      {r.atencao.length > 0 && (
        <section>
          <div className="sec-title"><h2>Pontos de atenção</h2></div>
          <ul className="es-att">{r.atencao.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </section>
      )}

      <section>
        <div className="sec-title"><h2>Escolas mês a mês</h2><span>resp · rev · pend · disp · — não precisava responder</span></div>
        {meses.length ? (
          <div className="es-tbl">
            <table>
              <thead><tr><th>Escola</th>{meses.map(m => <th key={m.id} className="m">{MES3[+m.id.slice(5) - 1]}/{m.id.slice(2, 4)}</th>)}</tr></thead>
              <tbody>
                {r.grade.map(g => (
                  <tr key={g.vinculo}>
                    <td><b>{g.escola}</b><div className="sub">{g.projeto}</div></td>
                    {meses.map(m => {
                      const c = CEL[g.meses[m.id]]
                      return <td key={m.id} className="m">{c && <span className={`cel ${c[1]}`} title={g.meses[m.id]}>{c[0]}</span>}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty">Nenhum mês com acompanhamento no período.</div>}
      </section>

      {(['resultados', 'desafios'] as const).map(tema => (
        <section key={tema}>
          <div className="sec-title"><h2>{tema === 'resultados' ? 'O que as escolas relataram' : 'Desafios e o que melhorar'}</h2><span>trechos literais, sem texto gerado por IA</span></div>
          {r.relatos[tema].length ? (
            <div className="es-stack">
              {r.relatos[tema].map((x, i) => <blockquote key={i} className="es-relato">{x.texto}<footer>{x.escola} · {x.mes} · {x.campo}</footer></blockquote>)}
            </div>
          ) : <div className="empty">Sem relatos escritos no período.</div>}
        </section>
      ))}

      {caps && caps.length > 0 && (
        <section>
          <div className="sec-title"><h2>Capacitações nos projetos <span className="from">vindo do Presente</span></h2><span>listas de presença desde {r.periodo.split(' a ')[0]}</span></div>
          <div className="es-list">
            {(caps as (Pick<Training, 'id' | 'title' | 'date' | 'start_time' | 'end_time' | 'state' | 'keep_open_hours' | 'beneficiary_name'> & { attendances: { count: number }[] })[]).map(c => (
              <div key={c.id} className="es-row">
                <div><div className="t">{c.title}</div><div className="s">{c.date.split('-').reverse().join('/')} · {c.beneficiary_name ?? 'instituição não informada'}</div></div>
                <div className="hide-sm s">{c.attendances?.[0]?.count ?? 0} presença(s)</div>
                <div className="acts">
                  <span className={`st ${statusOf(c) === 'done' ? 'st-ok' : 'st-sched'}`}>{statusOf(c) === 'done' ? 'Realizada' : statusOf(c) === 'live' ? 'Acontecendo' : 'Agendada'}</span>
                  <Link className="btn btn-ghost btn-sm" href={`/listas/${c.id}`}>Abrir</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {planoPat.length > 0 && (
        <section>
          <div className="sec-title"><h2>Plano de capacitações <span className="from">vindo do Presente</span></h2><span>a presença assinada confirma a participação da escola</span></div>
          <div className="es-list">
            {planoPat.map(i => {
              const n = i.training?.attendances?.[0]?.count ?? 0
              return (
                <div key={i.id} className="es-row">
                  <div><div className="t">{i.tipo}</div><div className="s">{i.data_prevista ? i.data_prevista.split('-').reverse().join('/') : 'sem data'}{i.cidade ? ` · ${i.cidade}` : ''}</div></div>
                  <div className="hide-sm s">{i.school?.nome ?? 'instituição a definir'}</div>
                  <div className="acts">
                    <span className={`st ${n > 0 ? 'st-ok' : i.situacao === 'realizada' ? 'st-pend' : 'st-sched'}`}>
                      {n > 0 ? `Participação confirmada · ${n}` : i.training_id ? 'Com lista' : i.situacao === 'realizada' ? 'Realizada · sem lista' : 'Planejada'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </section>
  )
}
