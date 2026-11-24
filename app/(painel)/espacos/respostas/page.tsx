import Link from 'next/link'
import { getStaff } from '@/lib/supabase/server'
import { carregarEspacos } from '@/lib/espacos/banco'
import { rotuloMes } from '@/lib/espacos/normalizacao'
import { camposPreenchidos, filtrarRespostas } from '@/lib/espacos/respostas'
import { Cabecalho, num } from '../ui'
import { FiltrosRespostas } from './Filtros'

export const metadata = { title: 'Respostas · Espaços de Leitura' }

type Busca = { vinculo?: string; mes?: string; projeto?: string; q?: string; r?: string }

// Tudo o que cada escola respondeu no formulário mensal: lista à esquerda, resposta inteira à direita.
// A tela Escolas e a tela Mês trazem para cá já filtrado pela escola (?vinculo=).
export default async function Respostas({ searchParams }: { searchParams: Promise<Busca> }) {
  const { supabase } = await getStaff()
  const sp = await searchParams
  const es = await carregarEspacos(supabase)
  const todas = filtrarRespostas(es.respostas, {}, es.descrever)
  const lista = filtrarRespostas(es.respostas, { vinculo: sp.vinculo, mes: sp.mes, projeto: sp.projeto, busca: sp.q }, es.descrever)
  const atual = lista.find(r => r.resposta_id === sp.r) ?? lista[0]
  const meses = [...new Set(todas.map(r => String(r.mes || '')).filter(Boolean))].sort().reverse()
  const projetos = [...new Set(todas.map(r => r.projeto).filter(Boolean))].sort()
  const escolaDoFiltro = sp.vinculo ? es.descrever(sp.vinculo).escola : ''

  const link = (r: string) => {
    const p = new URLSearchParams(Object.entries({ ...sp, r }).filter(([, v]) => v) as [string, string][])
    return `/espacos/respostas?${p}`
  }
  const data = (d: unknown) => (d instanceof Date ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) : '')

  return (
    <section className="view">
      <Cabecalho titulo="Respostas" texto={`Tudo o que cada escola respondeu no formulário mensal. ${todas.length} ${todas.length === 1 ? 'resposta recebida' : 'respostas recebidas'}.`} />

      <FiltrosRespostas meses={meses.map(m => ({ valor: m, rotulo: rotuloMes(m) }))} projetos={projetos} escola={escolaDoFiltro} />

      {lista.length ? (
        <div className="rs">
          <nav className="rs-lista" aria-label="Respostas">
            {lista.map(r => (
              <Link key={String(r.resposta_id)} href={link(String(r.resposta_id))} scroll={false} className="rs-item" aria-current={r === atual ? 'true' : undefined}>
                <span className="l1"><b>{r.escola}</b><small>{data(r.carimbo)}</small></span>
                <span className="l2">
                  {r.projeto}{r.mes ? ` · ${rotuloMes(String(r.mes))}` : ''}
                  {r.situacao !== 'válida' && <span className="st st-warn">{String(r.situacao)}</span>}
                </span>
              </Link>
            ))}
          </nav>

          {atual && (
            <article className="rs-leitura" id="resposta">
              <div className="rs-cab">
                <div>
                  <h2>{atual.escola}</h2>
                  <div className="sub">
                    {[atual.cidade, atual.projeto, atual.mes ? `mês de referência: ${rotuloMes(String(atual.mes))}` : 'mês não reconhecido', atual.carimbo instanceof Date ? `recebida em ${data(atual.carimbo)}` : '']
                      .filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className={`st ${atual.situacao === 'válida' ? 'st-ok' : 'st-warn'}`}>{atual.situacao === 'válida' ? 'ligada à escola' : String(atual.situacao)}</span>
              </div>
              {atual.situacao === 'em revisão' && (
                <div className="es-why">Em revisão: {String(atual.motivos)}. <Link href="/espacos/revisao">Revisar agora</Link></div>
              )}
              <div className="rs-nums">
                <div><b>{num(atual.total_estudantes ?? atual.total_visitas)}</b><span>{atual.total_estudantes !== null && atual.total_estudantes !== undefined ? 'estudantes no mês' : 'visitas no mês'}</span></div>
                <div><b>{num(atual.total_emprestimos)}</b><span>empréstimos</span></div>
                <div><b>{String(atual.atividades_faixa || '').replace(/[()]/g, '').trim() || num(atual.total_eventos)}</b><span>atividades</span></div>
                <div><b className="txt">{String(atual.uso_no_mes || '—')}</b><span>uso do espaço</span></div>
              </div>
              <h3 className="rs-sec">O que a escola respondeu</h3>
              <dl className="rs-qa">
                {camposPreenchidos(atual).map(c => (
                  <div key={c.campo}>
                    <dt>{c.rotulo}</dt>
                    <dd>{c.campo === 'anexos' ? c.valor.split(/,\s*/).map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer">Anexo {i + 1}</a>) : c.valor}</dd>
                  </div>
                ))}
              </dl>
            </article>
          )}
        </div>
      ) : (
        <div className="empty">
          <span className="hand wipe">Nenhuma resposta aqui…</span><br />
          {escolaDoFiltro ? `${escolaDoFiltro} ainda não respondeu o formulário pelo sistema.` : 'Nenhuma resposta com esses filtros.'}
        </div>
      )}
    </section>
  )
}
