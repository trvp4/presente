// Grava clipes curtos das animações de caneta do Presente para o vídeo.
// Abre o Edge; a pessoa faz o login; o resto é automático. Usa uma lista de demonstração
// (apagada no final). Uso: node scripts/video-animacoes.mjs [--apenas=02,03]  →  ../video/clipes/*.webm
import { mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { adminClient } from './env.mjs'

const SITE = 'https://presente.presente.workers.dev'
const OUT = fileURLToPath(new URL('../../video/clipes/', import.meta.url))
const TMP = fileURLToPath(new URL('../../video/.tmp-gravacao/', import.meta.url))
mkdirSync(OUT, { recursive: true })
const pausa = ms => new Promise(r => setTimeout(r, ms))
const DEMO_LISTA = 'Capacitação de demonstração'
const DEMOS = ['Voluntária Demonstração', 'Voluntário Demonstração']
const admin = adminClient()

function cpfDemo() {
  const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  const dv = a => { const s = a.reduce((acc, x, i) => acc + x * (a.length + 1 - i), 0); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  d.push(dv(d)); d.push(dv(d))
  return d.join('')
}

// assinatura "à mão": laço + ondas, em velocidade variável (mostra o traço mais grosso/fino)
async function assinar(page) {
  const box = await page.locator('.sigpad canvas').boundingBox()
  const x0 = box.x + 28, y0 = box.y + box.height * 0.62
  const pts = []
  for (let i = 0; i <= 90; i++) {
    const t = i / 90
    const x = x0 + t * (box.width - 70) + Math.sin(t * 22) * 6
    const y = y0 - Math.sin(t * 13) * 22 * (1 - t * 0.4) - (t < 0.15 ? t * 60 : 9)
    pts.push([x, y, i % 20 < 10 ? 4 : 1]) // alterna trechos lentos e rápidos
  }
  await page.mouse.move(pts[0][0], pts[0][1])
  await page.mouse.down()
  for (const [x, y, steps] of pts) { await page.mouse.move(x, y, { steps }); await pausa(12) }
  await page.mouse.up()
}

const browser = await chromium.launch({ channel: 'msedge', headless: false })
let estado
let lista

async function cena(nome, fn, { celular = false } = {}) {
  const dir = `${TMP}${nome}/`
  const ctx = await browser.newContext(celular
    // o gravador não amplia a tela: o vídeo tem o tamanho do viewport (540×1170, proporção de celular)
    ? { viewport: { width: 540, height: 1170 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', recordVideo: { dir, size: { width: 540, height: 1170 } } }
    : { viewport: { width: 1440, height: 900 }, locale: 'pt-BR', storageState: estado, recordVideo: { dir, size: { width: 1440, height: 900 } } })
  const page = await ctx.newPage()
  await fn(page)
  await ctx.close()
  await page.video().saveAs(`${OUT}${nome}.webm`)
  console.log(`  ✓ ${nome}.webm`)
}

// --apenas=02,03 regrava só esses clipes (o login só é pedido se algum deles for do painel)
const APENAS = (process.argv.find(a => a.startsWith('--apenas=')) ?? '').slice(9).split(',').filter(Boolean)
const quer = n => !APENAS.length || APENAS.includes(n)
const PAINEL = ['01', '02', '04', '05', '06']

try {
  if (PAINEL.some(quer)) {
  // login (não gravado)
  const loginCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const lp = await loginCtx.newPage()
  await lp.goto(`${SITE}/login`)
  console.log('\n>>> Faça o login na janela do Edge (seu usuário da Equipe). Aguardando...\n')
  await lp.waitForURL(u => !new URL(u).pathname.startsWith('/login'), { timeout: 5 * 60_000 })
  estado = await loginCtx.storageState()
  await loginCtx.close()

  }

  // 1. logo se escrevendo, sublinhado do título e texto à mão (antes de existir a lista de demonstração)
  if (quer('01')) await cena('01-logo-e-titulo', async page => {
    await page.goto(SITE)
    await pausa(4500)
    await page.locator('.logo').hover() // passar o mouse reescreve o logo
    await pausa(2200)
  })

  // lista de demonstração, aberta agora
  const { data: p } = await admin.from('projects').select('id').eq('name', 'Biblioteca Futuro').maybeSingle()
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const { data: t, error } = await admin.from('trainings').insert({
    project_id: p.id, title: DEMO_LISTA, date: hoje, start_time: '08:00', end_time: '22:00', instructor: 'Maria Demonstração',
    expected_count: 25, code: 'DEMO' + Math.random().toString(36).slice(2, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'X'),
    state: 'open', beneficiary_name: 'Escola Demonstração', beneficiary_cnpj: '11222333000181', city: 'São Paulo – SP',
  }).select('id, code').single()
  if (error) throw new Error(error.message)
  lista = t

  // 2. QR code "imprimindo" e o botão Copiar
  if (quer('02')) await cena('02-qrcode-e-copiar', async page => {
    await page.goto(`${SITE}/listas/${lista.id}`)
    await pausa(3500)
    await page.getByRole('button', { name: 'Copiar link' }).click()
    await pausa(2500)
  })

  // 3. voluntário assinando no celular
  if (quer('03') || quer('04')) await cena('03-voluntario-assinando', async page => {
    await page.goto(`${SITE}/p/${lista.code}`)
    await pausa(1500)
    await page.locator('#vName').pressSequentially(DEMOS[0], { delay: 55 })
    await page.locator('#vRole').pressSequentially('Monitor(a)', { delay: 55 })
    await page.locator('#vCpf').pressSequentially(cpfDemo(), { delay: 55 })
    await page.locator('.sigpad canvas').scrollIntoViewIfNeeded()
    await pausa(500)
    await assinar(page)
    await pausa(600)
    await page.locator('.consent input').check()
    await pausa(500)
    await page.getByRole('button', { name: 'Confirmar presença' }).click()
    await page.getByText('Presença confirmada').waitFor()
    await pausa(3500) // a assinatura é "reescrita" na confirmação
  }, { celular: true })

  // 4. assinatura chegando ao vivo no painel
  const { data: primeira } = await admin.from('attendances').select('signature').eq('training_id', lista.id).limit(1).single()
  if (quer('04')) await cena('04-assinatura-ao-vivo', async page => {
    await page.goto(`${SITE}/listas/${lista.id}`)
    await pausa(3500)
    await admin.from('attendances').insert({ training_id: lista.id, full_name: DEMOS[1], role: 'Arte-educador(a)', cpf: cpfDemo(), signature: primeira.signature })
    await page.locator('.att li .nm', { hasText: DEMOS[1] }).waitFor({ timeout: 15_000 })
    await pausa(3500)
  })

  // 5. folha em Word sendo preenchida + carimbo
  if (quer('05')) await cena('05-exportar-word-carimbo', async page => {
    await page.goto(`${SITE}/listas/${lista.id}`)
    await pausa(2000)
    await page.getByRole('button', { name: /Exportar lista em Word|Gerar lista em Word/ }).click()
    await pausa(6000)
  })

  // 6. selo "Lista enviada" com o check escrito à mão
  await admin.from('trainings').update({ state: 'closed' }).eq('id', lista.id)
  if (quer('06')) await cena('06-selo-lista-enviada', async page => {
    await page.goto(`${SITE}/listas/${lista.id}`)
    await pausa(1500)
    await page.getByRole('button', { name: /Gerar lista em Word|Exportar lista em Word/ }).click()
    await pausa(3500)
    await page.getByRole('button', { name: 'Marcar como enviado' }).click()
    await pausa(3500)
  })
} finally {
  if (lista) await admin.from('trainings').delete().eq('id', lista.id)
  await admin.from('attendances').delete().in('full_name', DEMOS)
  await browser.close()
  try { rmSync(TMP, { recursive: true, force: true }) } catch {} // o Windows às vezes ainda segura o arquivo
  console.log('\nDados de demonstração apagados.')
}
console.log(`Clipes salvos em ${OUT}`)
