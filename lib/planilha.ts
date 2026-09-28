// Planilha em CSV que abre direto no Excel em português (BOM + ponto e vírgula).
// Texto que começa com = + - @ (ou tab/enter) viraria fórmula no Excel: recebe ' na frente para ficar só texto.
const celula = (v: string | number) => {
  const s = typeof v === 'number' ? String(v) : String(v).replace(/^([=+\-@\t\r])/, "'$1")
  return `"${s.replace(/"/g, '""')}"`
}

export const planilhaCsv = (linhas: (string | number)[][]) =>
  '﻿' + linhas.map(l => l.map(celula).join(';')).join('\r\n')
