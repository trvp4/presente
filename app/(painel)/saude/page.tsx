import Link from 'next/link'
import { getStaff } from '@/lib/supabase/server'
import { resumoDasRodadas, type Status } from '@/lib/saude'
import { Underline } from '@/components/ui'
import { AcoesDoAchado, ConferirAgora } from './Botoes'

export const metadata = { title: 'Saúde do sistema' }

type Rodada = { quando: string; origem: string; ms_banco: number | null; resultado: { chave: string; nome: string; status: Status; valor: string; detalhe?: string }[] }
type Achado = { id: string; criado_em: string; gravidade: 'P1' | 'P2' | 'P3'; titulo: string; detalhe: string | null; categoria: string; estado: string; acao: string | null; origem: string }

const FILTROS = [
  { f: 'abertos', rotulo: 'Abertos', ok: (a: Achado) => a.estado === 'aberto' || a.estado === 'aguarda_voce' },
  { f: 'voce', rotulo: 'Aguardam você', ok: (a: Achado) => a.estado === 'aguarda_voce' },
  { f: 'P1', rotulo: 'P1', ok: (a: Achado) => a.gravidade === 'P1' },
  { f: 'P2', rotulo: 'P2', ok: (a: Achado) => a.gravidade === 'P2' },
  { f: 'P3', rotulo: 'P3', ok: (a: Achado) => a.gravidade === 'P3' },
  { f: 'todos', rotulo: 'Todos', ok: () => true },
]
const ESTADO = { aberto: 'Aberto', aguarda_voce: 'Aguarda você', resolvido: 'Resolvido', ignorado: 'Ignorado' } as Record<string, string>
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const diaBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
const idade = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`
}

export default async function Saude({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { supabase } = await getStaff()
  const { f = 'abertos' } = await searchParams
  const desde = new Date(Date.now() - 30 * 864e5).toISOString()
  const [rod, ach] = await Promise.all([
    supabase.from('saude_rodadas').select('quando, origem, ms_banco, resultado').gte('quando', desde).order('quando', { ascending: false }).limit(2000),
    supabase.from('achados').select('id, criado_em, gravidade, titulo, detalhe, categoria, estado, acao, origem').order('criado_em', { ascending: false }),
  ])

  const cabecalho = (texto: string) => (
    <div className="head">
      <div>
        <span className="modchip presente"><i />Central</span>
        <h1><Underline>Saúde do sistema</Underline></h1>
        <p>{texto}</p>
      </div>
      <div className="acts"><ConferirAgora /></div>
    </div>
  )

  if (rod.error || ach.error) {
    return (
      <section className="view">
        {cabecalho('Conferências de hora em hora do site, do banco, das listas e dos formulários.')}
        <div className="empty"><span className="hand wipe">Ainda não dá para mostrar…</span><br />As tabelas da Saúde do sistema não foram criadas: rode a migração <span className="mono">0012_saude_do_sistema.sql</span> no Supabase.</div>
      </section>
    )
  }

  const rodadas = (rod.data ?? []) as Rodada[]
  const achados = (ach.data ?? []) as Achado[]
  const atual = rodadas[0]
  const { noAr, porDia } = resumoDasRodadas(rodadas, new Date())
  const problemas = atual ? atual.resultado.filter(v => v.status !== 'ok').length : 0
  const abertos = achados.filter(FILTROS[0].ok)
  const filtro = FILTROS.find(x => x.f === f) ?? FILTROS[0]
  const lista = achados.filter(filtro.ok).sort((a, b) => a.gravidade.localeCompare(b.gravidade))
  const maxDia = Math.max(1, ...porDia.map(d => d.problemas ?? 0))
  const proxima = new Date(Math.ceil(Date.now() / 3600e3) * 3600e3).toISOString()

  return (
    <section className="view">
      {cabecalho(atual
        ? `Última conferência ${idade(atual.quando)} às ${hora(atual.quando)} · próxima às ${hora(proxima)}.`
        : 'Nenhuma conferência ainda: clique em "Conferir agora" ou espere a próxima hora cheia.')}

      <div className="sd-kpis">
        <div className="sd-kpi"><span>No ar (30 dias)</span><b>{noAr === null ? '—' : `${(noAr * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`}<small>%</small></b><em>{rodadas.length} conferências · meta 99,5%</em></div>
        <div className="sd-kpi"><span>Tempo de resposta</span><b>{atual?.ms_banco ?? '—'}<small>ms</small></b><em>banco de dados, agora</em></div>
        <div className={`sd-kpi${problemas ? ' atencao' : ''}`}><span>Verificações com problema</span><b>{atual ? problemas : '—'}</b><em>de {atual?.resultado.length ?? 0} na última conferência</em></div>
        <div className="sd-kpi"><span>Achados abertos</span><b>{abertos.length}</b><em>{abertos.filter(a => a.gravidade === 'P1').length} urgentes (P1)</em></div>
        <div className={`sd-kpi${abertos.some(a => a.estado === 'aguarda_voce') ? ' pink' : ''}`}><span>Aguardam você</span><b>{achados.filter(a => a.estado === 'aguarda_voce').length}</b><em>correções do agente para aprovar</em></div>
      </div>

      <div className="sd-dois">
        <div className="card">
          <div className="sec-title"><h2>Verificações com problema por dia</h2><span>últimos 30 dias</span></div>
          <div className="sd-barras" role="img" aria-label="Verificações com problema por dia nos últimos 30 dias">
            {porDia.map((d, i) => (
              <i key={d.dia} title={`${d.dia.split('-').reverse().join('/')}: ${d.problemas === null ? 'sem conferência' : `${d.problemas} com problema`}`}
                className={d.problemas === null ? 'vazio' : d.problemas === 0 ? 'zero' : i === porDia.length - 1 ? 'hoje' : ''}
                style={{ height: d.problemas ? `${Math.max(8, (d.problemas / maxDia) * 100)}%` : undefined }} />
            ))}
          </div>
          <div className="sd-eixo"><span>{porDia[0].dia.split('-').reverse().slice(0, 2).join('/')}</span><span>hoje</span></div>
          {rodadas.length < 24 && <p className="sd-nota">O histórico começa a encher a partir da primeira conferência: uma por hora.</p>}
        </div>
        <div className="card">
          <div className="sec-title"><h2>Verificações de agora</h2>{atual && <span>{atual.origem === 'manual' ? 'conferido à mão' : 'conferência automática'} · {hora(atual.quando)}</span>}</div>
          {atual ? (
            <ul className="sd-verif">
              {atual.resultado.map(v => (
                <li key={v.chave} title={v.detalhe}><i className={`sd-dot ${v.status}`} /><span>{v.nome}</span><em>{v.valor}</em></li>
              ))}
            </ul>
          ) : <div className="empty">Nenhuma conferência ainda.</div>}
        </div>
      </div>

      <div className="card sd-achados">
        <div className="sd-achados-cab">
          <h2>Achados</h2>
          <nav className="sd-chips" aria-label="Filtrar achados">
            {FILTROS.map(x => <Link key={x.f} href={x.f === 'abertos' ? '/saude' : `/saude?f=${x.f}`} aria-current={x.f === filtro.f ? 'true' : undefined}>{x.rotulo}</Link>)}
          </nav>
        </div>
        {lista.length ? (
          <div className="es-tbl sd-tbl">
            <table>
              <thead><tr><th>Gravidade</th><th>Achado</th><th className="hide-sm">Categoria</th><th>Estado</th><th>Ação</th></tr></thead>
              <tbody>
                {lista.map(a => (
                  <tr key={a.id} className={a.estado === 'resolvido' || a.estado === 'ignorado' ? 'fechado' : undefined}>
                    <td><span className={`sd-grav ${a.gravidade}`}>{a.gravidade} · {idade(a.criado_em)}</span></td>
                    <td><b>{a.titulo}</b><div className="sub">{a.id} · aberto em {diaBr(a.criado_em)}{a.origem === 'agente' ? ' pelo agente' : ''}{a.detalhe ? ` · ${a.detalhe}` : ''}</div></td>
                    <td className="hide-sm">{a.categoria}</td>
                    <td><span className={`sd-estado ${a.estado}`}>{ESTADO[a.estado] ?? a.estado}</span></td>
                    <td className="sd-acao"><AcoesDoAchado id={a.id} estado={a.estado} />{a.acao && a.estado !== 'resolvido' && a.estado !== 'ignorado' && <div className="sub">{a.acao}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">{filtro.f === 'abertos' ? 'Nenhum achado aberto. As verificações abrem um aqui quando algo sair do normal.' : 'Nenhum achado neste filtro.'}</div>
        )}
      </div>
    </section>
  )
}
