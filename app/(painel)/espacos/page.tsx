import Link from 'next/link'
import { getStaff } from '@/lib/supabase/server'
import { carregarEspacos, cicloPadrao, idObrigacao, obrigacoesAbertas } from '@/lib/espacos/banco'
import { rotuloMes } from '@/lib/espacos/normalizacao'
import { todayISO } from '@/lib/format'
import { Cabecalho, num, pct } from './ui'
import { AcoesObrigacao, EncerrarCiclo, NovoCiclo } from './Acoes'

export const metadata = { title: 'Mês · Espaços de Leitura' }

const dataCurta = (d: unknown) => (d instanceof Date ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) : '')

export default async function Mes({ searchParams }: { searchParams: Promise<{ ciclo?: string }> }) {
  const { supabase } = await getStaff()
  const es = await carregarEspacos(supabase)
  const { ciclo: pedido } = await searchParams
  const ciclos = [...es.ciclos].sort((a, b) => String(b.ciclo_id).localeCompare(String(a.ciclo_id)))
  const ciclo = ciclos.find(c => c.ciclo_id === pedido) ?? cicloPadrao(es.ciclos)
  const sugestao = todayISO().slice(0, 7)

  if (!ciclo)
    return (
      <section className="view">
        <Cabecalho titulo="Mês" texto="Quem precisava responder o formulário do mês, quem já respondeu e quem falta cobrar." />
        <div className="empty"><span className="hand wipe">Nenhum mês aberto ainda…</span><br />Abra o primeiro mês: as escolas em acompanhamento passam a ser esperadas.<br /><br /><NovoCiclo sugestao={sugestao} /></div>
      </section>
    )

  const encerrado = ciclo.situacao === 'encerrado'
  const abertas = obrigacoesAbertas(es.obrigacoes, ciclo.ciclo_id)
  const ultimoContato = new Map(es.contatos.map(c => [c.obrigacao_id, c])) // em ordem de data: o último contato fica
  const versoes = es.fechamentos.filter(f => f.ciclo_id === ciclo.ciclo_id).sort((a, b) => b.versao - a.versao)

  return (
    <section className="view">
      <Cabecalho titulo={rotuloMes(ciclo.ciclo_id).replace('/', ' de ')} texto="Quem precisava responder o formulário do mês, quem já respondeu e quem falta cobrar.">
        {ciclos.length > 1 && (
          <nav className="es-seg" aria-label="Escolher mês">
            {ciclos.slice(0, 6).map(c => (
              <Link key={c.ciclo_id} href={`/espacos?ciclo=${c.ciclo_id}`} aria-current={c.ciclo_id === ciclo.ciclo_id ? 'page' : undefined}>{rotuloMes(c.ciclo_id).slice(0, 3)}/{c.ciclo_id.slice(2, 4)}</Link>
            ))}
          </nav>
        )}
        <EncerrarCiclo id={ciclo.ciclo_id} encerrado={encerrado} />
        {!ciclos.some(c => c.ciclo_id === sugestao) && <NovoCiclo sugestao={sugestao} />}
      </Cabecalho>

      <div className="es-kpis">
        <div className="es-kpi"><b>{num(ciclo.esperadas)}</b><span>precisam responder</span></div>
        <div className="es-kpi"><b>{num(ciclo.respondidas)}</b><span>responderam</span></div>
        <div className="es-kpi"><b>{num(ciclo.em_revisao)}</b><span>em revisão</span></div>
        <div className="es-kpi lilac"><b>{num(ciclo.pendentes)}</b><span>pendentes</span></div>
        <div className="es-kpi"><b>{pct(ciclo.taxa_resposta)}</b><span>taxa de resposta</span></div>
      </div>

      {encerrado && (
        <p className="es-note">
          <b>Mês encerrado.</b> {versoes.length ? `Resultado guardado na versão ${versoes[0].versao}` : 'Resultado sendo guardado'}
          {versoes.length > 1 && ` (mudou depois do encerramento; as ${versoes.length - 1} versões anteriores continuam registradas)`}.
          {ciclo.prazo && ` Prazo era ${String(ciclo.prazo).split('-').reverse().join('/')}.`}
        </p>
      )}

      <section>
        <div className="sec-title">
          <h2>Quem falta responder</h2>
          <span>{ciclo.prazo ? `prazo ${String(ciclo.prazo).split('-').reverse().join('/')}` : 'sem prazo definido'}</span>
        </div>
        {abertas.length ? (
          <div className="es-list">
            {abertas.map(o => {
              const d = es.descrever(o.vinculo_id)
              const contato = ultimoContato.get(idObrigacao(o.ciclo_id, o.vinculo_id))
              const dispensada = o.situacao === 'dispensada'
              return (
                <div key={o.obrigacao_id} className="es-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="t">{d.escola}</div>
                    <div className="s">
                      {d.cidade && `${d.cidade} · `}
                      {dispensada ? `dispensada: ${o.motivo_dispensa}` : o.situacao === 'em revisão' ? 'respondeu; resposta em revisão' : o.meses_sem_responder === 'nunca respondeu' ? 'nunca respondeu pelo sistema' : `última resposta: ${rotuloMes(o.ultima_resposta)}`}
                      {contato && ` · contato ${dataCurta(contato.data)} por ${contato.canal}${contato.resultado ? `: ${contato.resultado}` : ''}`}
                    </div>
                  </div>
                  <div className="hide-sm" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.projeto}</div>
                    <div className="s">{d.patrocinador}</div>
                  </div>
                  {o.situacao === 'em revisão'
                    ? <div className="acts"><Link className="btn btn-ghost btn-sm" href="/espacos/revisao">Revisar</Link></div>
                    : <AcoesObrigacao ciclo={o.ciclo_id} vinculo={o.vinculo_id} dispensada={dispensada} />}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty"><span className="hand wipe">{num(ciclo.esperadas) === '0' ? 'Ninguém em acompanhamento neste mês…' : 'Todas responderam!'}</span></div>
        )}
      </section>
    </section>
  )
}
