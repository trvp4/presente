import Link from 'next/link'
import { getStaff } from '@/lib/supabase/server'
import { FORM_AVALIACAO, resumir, type Avaliacao, type Opcao } from '@/lib/avaliacao'
import { CopyButton, QrCanvas } from '@/components/client'

export const metadata = { title: 'Avaliações' }

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`)

// Cor de cada opção pela posição dentro do tom: a pior negativa é a mais forte, a melhor positiva é preta.
const CORES = { neg: ['#B0265C', '#E07FA3'], neutro: ['#CFCFCF'], pos: ['#8A8A8A', '#3A3A3A', '#000000'] }
function cor(o: Opcao, opcoes: Opcao[]) {
  const mesmas = opcoes.filter(x => x.tom === o.tom), i = mesmas.indexOf(o), c = CORES[o.tom]
  return o.tom === 'neg' ? c[Math.min(i, c.length - 1)] : c[Math.max(0, c.length - mesmas.length + i)]
}

export default async function Page({ searchParams }: { searchParams: Promise<{ projeto?: string }> }) {
  const { projeto } = await searchParams
  const { supabase } = await getStaff()
  const { data } = await supabase.from('av_respostas').select('id, carimbo, projeto, respostas').order('carimbo', { ascending: false })
  const todas = (data ?? []) as Avaliacao[]
  const projetos = [...todas.reduce((m, a) => m.set(a.projeto, (m.get(a.projeto) ?? 0) + 1), new Map<string, number>())].sort((a, b) => a[0].localeCompare(b[0]))
  const r = resumir(projeto ? todas.filter(a => a.projeto === projeto) : todas)

  return (
    <section className="view">
      <div className="head">
        <div>
          <h1>Avaliações</h1>
          <p>O que os professores acharam das formações. As respostas do Google Forms chegam aqui sozinhas.</p>
        </div>
      </div>

      <div className="av-grid">
        <div className="av-main">
          {projetos.length > 1 && (
            <nav className="av-chips" aria-label="Filtrar por projeto">
              <Link className="chip" href="/avaliacoes" aria-pressed={!projeto}>Todos · {todas.length}</Link>
              {projetos.map(([p, n]) => (
                <Link key={p} className="chip" href={`/avaliacoes?projeto=${encodeURIComponent(p)}`} aria-pressed={p === projeto}>{p} · {n}</Link>
              ))}
            </nav>
          )}

          {r.total ? (
            <>
              <div className="av-kpis">
                <div className="card"><b>{r.total}</b><span>avaliações</span></div>
                <div className="card"><b>{pct(r.satisfacao)}</b><span>satisfeitos com a formação</span></div>
                <div className="card"><b>{pct(r.recomendaria)}</b><span>recomendariam a outros professores</span></div>
                <div className="card"><b>{pct(r.participaria)}</b><span>participariam de outra</span></div>
              </div>

              <div className="card av-perguntas">
                {r.perguntas.map(p => p.tipo === 'escala' && (
                  <figure key={p.titulo} className="av-q">
                    <figcaption><span>{p.titulo}</span><b title="respostas positivas">{pct(p.aprovacao)}</b></figcaption>
                    <div className="av-bar" aria-hidden>
                      {p.opcoes.map(o => <i key={o.rotulo} style={{ flexGrow: o.n, background: cor(o, p.opcoes) }} />)}
                    </div>
                    <ul className="av-leg">
                      {p.opcoes.map(o => (
                        <li key={o.rotulo}><i style={{ background: cor(o, p.opcoes) }} />{o.rotulo} <small>{o.n} · {pct(o.n / p.total)}</small></li>
                      ))}
                    </ul>
                  </figure>
                ))}
              </div>

              {r.perguntas.map(p => p.tipo === 'texto' && (
                <details key={p.titulo} className="card av-textos" open={p.textos.length <= 6}>
                  <summary>{p.titulo} <small>{p.textos.length}</small></summary>
                  <ul>
                    {p.textos.map((t, i) => (
                      <li key={i}>
                        “{t.texto}”
                        <small>{!projeto && `${t.projeto} · `}{t.carimbo ? new Date(t.carimbo).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : ''}</small>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </>
          ) : (
            <div className="empty"><span className="hand wipe">Nenhuma avaliação ainda…</span><br />Assim que os professores responderem o formulário, os resultados aparecem aqui.</div>
          )}
        </div>

        <aside className="linkbox">
          <QrCanvas text={FORM_AVALIACAO} animate={false} label="QR code do formulário de avaliação" />
          <span className="lbl">Formulário de avaliação</span>
          <p className="hint">Mostre o QR code no fim da formação: os professores respondem pelo celular.</p>
          <div className="acts">
            <CopyButton text={FORM_AVALIACAO} />
            <a className="btn btn-ghost btn-sm" href={FORM_AVALIACAO} target="_blank" rel="noreferrer">Abrir formulário</a>
          </div>
        </aside>
      </div>
    </section>
  )
}
