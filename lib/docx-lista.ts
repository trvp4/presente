import {
  AlignmentType, BorderStyle, Document, HeightRule, ImageRun, Packer, Paragraph, Table, TableCell, TableRow,
  TextRun, VerticalAlign, WidthType,
} from 'docx'
import { REALIZACAO, brDate, fmtCnpj, fmtCpf, hm, todayISO, type Attendance, type Project, type Training } from './format'

// Gera a lista em Word (.docx) no modelo oficial da empresa
// ("Lista de presença – Capacitação"): A4, margens 2,5 cm / 3 cm, Calibri 11,
// logo do projeto centralizado, dados em negrito e tabela numerada com bordas finas.

type Img = { data: Uint8Array; type: 'png' | 'jpg'; width: number; height: number }

// data URL → bytes + tamanho em pixels (lê o cabeçalho do PNG/JPEG)
function decodeImage(dataUrl: string | null | undefined): Img | null {
  const m = dataUrl?.match(/^data:image\/(png|jpeg);base64,(.+)$/)
  if (!m) return null
  const data = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0))
  if (m[1] === 'png') {
    const v = new DataView(data.buffer)
    return { data, type: 'png', width: v.getUint32(16), height: v.getUint32(20) }
  }
  // JPEG: procura o marcador SOF com largura/altura
  let i = 2
  while (i < data.length) {
    if (data[i] !== 0xff) { i++; continue }
    const marker = data[i + 1]
    const len = (data[i + 2] << 8) | data[i + 3]
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { data, type: 'jpg', height: (data[i + 5] << 8) | data[i + 6], width: (data[i + 7] << 8) | data[i + 8] }
    }
    i += 2 + len
  }
  return null
}

// encaixa a imagem numa caixa mantendo a proporção (em pixels a 96 dpi)
const fit = (img: Img, maxW: number, maxH: number) => {
  const s = Math.min(maxW / img.width, maxH / img.height)
  return { width: Math.round(img.width * s), height: Math.round(img.height * s) }
}

const line = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
const borders = { top: line, bottom: line, left: line, right: line }
const COLS = [4100, 1900, 2504] // soma = largura útil da página (8504 twips)

const bold = (label: string, value = '') =>
  new Paragraph({ children: [new TextRun({ text: label, bold: true }), new TextRun(value)] })

const cell = (children: Paragraph[], width: number) =>
  new TableCell({ children, width: { size: width, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER, margins: { top: 60, bottom: 60, left: 100, right: 100 } })

const tight = { spacing: { after: 0, line: 240 } }

export async function buildListaDocx(t: Training, p: Project, list: Attendance[]): Promise<Blob> {
  const logo = decodeImage(p.logo)

  const header = new TableRow({
    tableHeader: true,
    height: { value: 528, rule: HeightRule.ATLEAST },
    children: ['NOME/CARGO', 'CPF', 'ASSINATURA'].map((h, i) =>
      cell([new Paragraph({ ...tight, children: [new TextRun({ text: h, bold: true })] })], COLS[i]),
    ),
  })

  const rows = list.map((a, i) => {
    const sig = decodeImage(a.signature)
    return new TableRow({
      cantSplit: true,
      height: { value: 528, rule: HeightRule.ATLEAST },
      children: [
        cell([new Paragraph({ ...tight, children: [new TextRun(`${i + 1}.  ${a.full_name} / ${a.role}`)] })], COLS[0]),
        cell([new Paragraph({ ...tight, children: [new TextRun(fmtCpf(a.cpf))] })], COLS[1]),
        cell([new Paragraph({ ...tight, children: sig ? [new ImageRun({ type: sig.type, data: sig.data, transformation: fit(sig, 150, 34) })] : [] })], COLS[2]),
      ],
    })
  })

  const doc = new Document({
    creator: 'Presente',
    title: `Lista de presença – ${t.title}`,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 }, paragraph: { spacing: { after: 160, line: 259 } } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1417, bottom: 1417, left: 1701, right: 1701, header: 708, footer: 708 },
        },
      },
      children: [
        ...(logo ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: logo.type, data: logo.data, transformation: fit(logo, 202, 88) })] })] : []),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Lista de presença – Capacitação', bold: true })] }),
        bold('Projeto: ', `${p.name} · Pronac ${p.pronac}`),
        bold('Realização: ', REALIZACAO),
        bold('Instituição Beneficiada: ', `${t.beneficiary_name ?? ''}${t.beneficiary_cnpj ? ` · CNPJ ${fmtCnpj(t.beneficiary_cnpj)}` : ''}`),
        bold('Cidade: ', t.city ?? ''),
        bold('Data: ', brDate(t.date)),
        bold('Horário: ', `${hm(t.start_time)} às ${hm(t.end_time)}`),
        bold('Tema: ', `${t.title}${t.instructor ? ` · Instrutor(a): ${t.instructor}` : ''}`),
        new Paragraph({}),
        new Table({
          width: { size: COLS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
          columnWidths: COLS,
          rows: [header, ...rows],
        }),
        new Paragraph({
          spacing: { before: 240 },
          children: [new TextRun({
            text: `Total: ${list.length} ${list.length === 1 ? 'participante' : 'participantes'}. Assinaturas coletadas digitalmente pelo sistema Presente, com consentimento de cada participante para uso na prestação de contas do projeto. Documento gerado em ${brDate(todayISO())}.`,
            size: 16, color: '555555',
          })],
        }),
      ],
    }],
  })

  return Packer.toBlob(doc)
}
