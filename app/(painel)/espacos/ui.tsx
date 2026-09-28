// Peças comuns das telas do Espaços de Leitura
import { Underline } from '@/components/ui'

export const LILAS = '#B9B1D6'
export const pct = (v: unknown) => (typeof v === 'number' ? `${Math.round(v * 100)}%` : '—')
export const num = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('pt-BR') : '—')

export function Cabecalho({ titulo, texto, children }: { titulo: string; texto: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="head">
      <div>
        <span className="modchip espacos"><i />Espaços de Leitura</span>
        <h1><Underline cor={LILAS}>{titulo}</Underline></h1>
        <p>{texto}</p>
      </div>
      {children && <div className="acts">{children}</div>}
    </div>
  )
}
