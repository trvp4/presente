import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { buildListaDocx } from '@/lib/docx-lista'
import type { Attendance, Project, Training } from '@/lib/format'

// PNG 1×1 válido, usado como logo e como Assinatura
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg=='

const capacitacao: Training = {
  id: 't1', project_id: 'p1', title: 'Mediação de leitura', date: '2026-09-24', start_time: '14:00:00', end_time: '16:00:00',
  instructor: 'Maria', beneficiary_name: 'Escola A & B', beneficiary_cnpj: '11222333000181', city: 'São Paulo – SP',
  expected_count: 25, keep_open_hours: null, open_until: null, code: 'ABC234', state: 'auto', pdf_sent_at: null, created_at: '2026-09-20T12:00:00Z',
}
const projeto: Project = { id: 'p1', name: 'Biblioteca Viva', pronac: '123456', logo: png, archived: false }
const presenca = (id: string, full_name: string): Attendance => ({
  id, training_id: 't1', full_name, role: 'Monitor(a)', cpf: '52998224725', signature: png, created_at: '2026-09-24T17:05:00Z',
})

async function abrir(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  const xml = await zip.file('word/document.xml')!.async('string')
  const texto = xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
  const imagens = xml.match(/<pic:pic\b/g)?.length ?? 0
  return { xml, texto, imagens }
}

describe('Documento da Lista em Word', () => {
  it('traz o cabeçalho do modelo oficial', async () => {
    const { texto } = await abrir(await buildListaDocx(capacitacao, projeto, []))
    expect(texto).toContain('Lista de presença – Capacitação')
    expect(texto).toContain('Projeto: Biblioteca Viva · Pronac 123456')
    expect(texto).toContain('Realização: Instituto Cuidare')
    expect(texto).toContain('Instituição Beneficiada: Escola A &amp; B · CNPJ 11.222.333/0001-81')
    expect(texto).toContain('Cidade: São Paulo – SP')
    expect(texto).toContain('Data: 24/09/2026')
    expect(texto).toContain('Horário: 14:00 às 16:00')
  })

  it('lista cada Presença numerada, com CPF completo e Assinatura', async () => {
    const { texto, imagens } = await abrir(await buildListaDocx(capacitacao, projeto, [presenca('a1', 'Ana Souza'), presenca('a2', 'Bruno Lima')]))
    expect(texto).toContain('NOME/CARGO')
    expect(texto).toContain('1.  Ana Souza / Monitor(a)')
    expect(texto).toContain('2.  Bruno Lima / Monitor(a)')
    expect(texto).toContain('529.982.247-25')
    expect(texto).toContain('Total: 2 participantes')
    expect(imagens).toBe(3) // logo + 2 assinaturas
  })

  it('funciona com Projeto sem logo', async () => {
    const { imagens, texto } = await abrir(await buildListaDocx(capacitacao, { ...projeto, logo: null }, [presenca('a1', 'Ana Souza')]))
    expect(imagens).toBe(1)
    expect(texto).toContain('Total: 1 participante.')
  })
})
