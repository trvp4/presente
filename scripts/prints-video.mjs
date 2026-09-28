// Tira os prints das etapas do Presente para o vídeo.
// Abre o Edge; a pessoa faz o login; o resto é automático. Cria uma lista e uma assinatura
// de demonstração e apaga as duas no final.
// Uso: node scripts/prints-video.mjs   →  prints em ../video/prints/
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { adminClient } from './env.mjs'

const SITE = 'https://presente.presente.workers.dev'
const OUT = new URL('../../video/prints/', import.meta.url)
mkdirSync(OUT, { recursive: true })
const file = name => fileURLToPath(new URL(`${name}.png`, OUT))
const pausa = ms => new Promise(r => setTimeout(r, ms))
const DEMO_LISTA = 'Capacitação de demonstração'
const DEMO_NOME = 'Voluntária Demonstração'

function cpfDemo() {
  const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  const dv = a => { const s = a.reduce((acc, x, i) => acc + x * (a.length + 1 - i), 0); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  d.push(dv(d)); d.push(dv(d))
  return d.join('')
}

// traço de assinatura no quadro (movimentos do mouse)
async function assinar(page) {
  const box = await page.locator('.sigpad canvas').boundingBox()
  const y0 = box.y + box.height * 0.6, x0 = box.x + 30
  await page.mouse.move(x0, y0)
  await page.mouse.down()
  for (let i = 0; i <= 60; i++) {
    const x = x0 + i * ((box.width - 80) / 60)
    const y = y0 - Math.sin(i / 4) * 18 - (i < 12 ? i * 1.5 : 18 - (i - 12) * 0.3)
    await page.mouse.move(x, y, { steps: 2 })
  }
  await page.mouse.up()
}

const browser = await chromium.launch({ channel: 'msedge', headless: false })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'pt-BR' })
const page = await ctx.newPage()
const admin = adminClient()
let n = 0
const print = async (nome, opts = {}) => {
  await pausa(opts.espera ?? 2200) // deixa as animações de caneta terminarem
  const alvo = `${String(++n).padStart(2, '0')}-${nome}`
  await (opts.page ?? page).screenshot({ path: file(alvo), fullPage: opts.inteira ?? false })
  console.log(`  ✓ ${alvo}.png`)
}

try {
  // 1. login
  await page.goto(`${SITE}/login`)
  await print('login', { espera: 800 })
  console.log('\n>>> Faça o login na janela do Edge (seu usuário da Equipe). Aguardando...\n')
  await page.waitForURL(u => !new URL(u).pathname.startsWith('/login'), { timeout: 5 * 60_000 })

  // 2. painel
  await page.goto(SITE)
  await print('painel', { inteira: true, espera: 3000 })

  // 3. criar lista: projeto
  await page.goto(`${SITE}/listas/nova`)
  await print('criar-lista-1-projeto')
  await page.getByRole('button', { name: 'Continuar' }).click()

  // 4. criar lista: encontro
  await page.fill('#title', DEMO_LISTA)
  await page.fill('#beneficiary_name', 'Escola Demonstração')
  await page.fill('#beneficiary_cnpj', '11222333000181')
  await page.fill('#city', 'São Paulo')
  await page.locator('.combo-list li').first().click()
  const agora = new Date(Date.now() - 10 * 60_000)
  const hh = d => d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  await page.fill('#start_time', hh(agora))
  await page.fill('#end_time', hh(new Date(agora.getTime() + 2 * 3600_000)))
  await page.fill('#expected_count', '25')
  await print('criar-lista-2-encontro', { espera: 800 })
  await page.getByRole('button', { name: 'Gerar link' }).click()

  // 5. link e QR code
  await page.getByText('Lista criada').waitFor()
  await print('criar-lista-3-link-e-qrcode', { espera: 2500 })
  const link = (await page.locator('.urlrow span').innerText()).trim()
  const code = link.split('/').pop()
  await page.getByRole('button', { name: 'Copiar' }).click()
  await print('copiar-link', { espera: 700 })

  // 6. voluntário no celular
  const cel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' })
  const vol = await cel.newPage()
  await vol.goto(`${SITE}/p/${code}`)
  await print('voluntario-1-formulario', { page: vol, espera: 1500 })
  await vol.fill('#vName', DEMO_NOME)
  await vol.fill('#vRole', 'Monitor(a)')
  await vol.fill('#vCpf', cpfDemo())
  await vol.locator('.sigpad canvas').scrollIntoViewIfNeeded()
  await assinar(vol)
  await vol.locator('.consent input').check()
  await print('voluntario-2-preenchido', { page: vol, inteira: true, espera: 600 })

  // 7. painel acompanhando ao vivo (abre antes do envio para mostrar a chegada)
  const { data: lista } = await admin.from('trainings').select('id').eq('code', code).single()
  await page.goto(`${SITE}/listas/${lista.id}`)
  await pausa(2500)
  await vol.getByRole('button', { name: 'Confirmar presença' }).click()
  await vol.getByText('Presença confirmada').waitFor()
  await print('voluntario-3-confirmado', { page: vol, inteira: true, espera: 2200 })
  // o painel (aberto antes do envio) precisa receber a assinatura sozinho, sem recarregar
  const aoVivo = await page.locator('.att li .nm', { hasText: DEMO_NOME }).waitFor({ timeout: 15_000 }).then(() => true, () => false)
  console.log(aoVivo ? '  ✓ assinatura chegou ao vivo no painel' : '  ✘ a assinatura NÃO chegou ao vivo no painel')
  await print('painel-assinatura-ao-vivo', { espera: 1800 })

  // 8. exportar em Word (animação da folha + carimbo)
  await page.getByRole('button', { name: /Exportar lista em Word|Gerar lista em Word/ }).click()
  await print('exportar-word', { espera: 4500 })
  await page.keyboard.press('Escape')

  // 9. documento no modelo da empresa (versão de impressão, igual ao Word)
  await page.goto(`${SITE}/imprimir/${lista.id}`)
  await print('documento-da-lista', { espera: 1500 })

  // 10. projetos
  await page.goto(`${SITE}/projetos`)
  await print('projetos', { espera: 1500 })
  await cel.close()
} finally {
  // limpeza: apaga a lista (e a assinatura) de demonstração
  const { data: demos } = await admin.from('trainings').select('id').eq('title', DEMO_LISTA)
  for (const d of demos ?? []) await admin.from('trainings').delete().eq('id', d.id)
  await admin.from('attendances').delete().eq('full_name', DEMO_NOME)
  console.log(`\nDados de demonstração apagados (${(demos ?? []).length} lista(s)).`)
  await browser.close()
}
console.log(`Prints salvos em ${fileURLToPath(OUT)}`)
