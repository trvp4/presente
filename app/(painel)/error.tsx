'use client'
import { useEffect } from 'react'

// Erro inesperado numa tela do painel (por exemplo, o banco fora do ar): o menu continua e dá para tentar de novo.
export default function Erro({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <section className="view">
      <div className="empty" role="alert">
        <span className="hand wipe">Algo não carregou…</span>
        <br />
        Pode ser o banco de dados fora do ar por alguns minutos. Nenhum dado foi perdido.
        <br />
        <button type="button" className="btn btn-dark btn-sm" style={{ marginTop: 14 }} onClick={() => retry()}>Tentar de novo</button>
        {error.digest && <div style={{ marginTop: 10, fontSize: 11 }}>Código para o suporte: {error.digest}</div>}
      </div>
    </section>
  )
}
