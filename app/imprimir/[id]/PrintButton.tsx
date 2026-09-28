'use client'

export default function PrintButton() {
  return <button className="btn btn-dark btn-sm" onClick={() => window.print()}>Imprimir / Salvar PDF</button>
}
