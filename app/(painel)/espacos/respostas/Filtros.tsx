'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

// Filtros da tela Respostas: mudam o endereço (?mes=&projeto=&q=), e a página relê no servidor.
export function FiltrosRespostas({ meses, projetos, escola }: { meses: { valor: string; rotulo: string }[]; projetos: string[]; escola: string }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams()
  const [busca, setBusca] = useState(sp.get('q') ?? '')

  const mudar = (campo: string, valor: string) => {
    const p = new URLSearchParams(sp.toString())
    if (valor) p.set(campo, valor); else p.delete(campo)
    p.delete('r') // a resposta aberta pode não estar no novo filtro
    router.replace(`${path}${p.size ? `?${p}` : ''}`, { scroll: false })
  }
  useEffect(() => {
    if (busca === (sp.get('q') ?? '')) return
    const t = setTimeout(() => mudar('q', busca.trim()), 300)
    return () => clearTimeout(t)
  }, [busca]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rs-filtros">
      {escola && (
        <span className="rs-escola">
          Só {escola}
          <button type="button" aria-label="Mostrar todas as escolas" onClick={() => mudar('vinculo', '')}>×</button>
        </span>
      )}
      <select aria-label="Mês" value={sp.get('mes') ?? ''} onChange={e => mudar('mes', e.target.value)}>
        <option value="">Todos os meses</option>
        {meses.map(m => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
      </select>
      <select aria-label="Projeto" value={sp.get('projeto') ?? ''} onChange={e => mudar('projeto', e.target.value)}>
        <option value="">Todos os projetos</option>
        {projetos.map(p => <option key={p}>{p}</option>)}
      </select>
      <input type="search" aria-label="Buscar escola" placeholder="Buscar escola ou cidade" value={busca} onChange={e => setBusca(e.target.value)} />
    </div>
  )
}
