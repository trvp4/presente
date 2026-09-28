// Tira os prints do README (pasta imagens/) só com dados fictícios. Abre o Edge; a pessoa faz o login;
// o resto é automático. Cria um patrocinador, projetos, escolas, respostas, plano e uma lista de
// demonstração, fotografa e apaga tudo no final. Nenhum dado real aparece nas imagens.
// Uso: node scripts/prints-readme.mjs
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { adminClient } from './env.mjs'

const SITE = 'https://presente.presente.workers.dev'
const OUT = new URL('../imagens/', import.meta.url)
mkdirSync(OUT, { recursive: true })
const pausa = ms => new Promise(r => setTimeout(r, ms))
const PAT = 'Fundação Aurora', PAT_CHAVE = 'FUNDACAO AURORA' // chavePatrocinador(PAT)
const DEMO = { lista: 'Mediação de leitura para professores', nome: 'Voluntária Demonstração', escola: 'Escola Demonstração', cnpj: '11222333000181', instrutora: 'Maria Demonstração' }
const ESCOLAS = [
  { nome: 'EMEF Monteiro Lobato', cidade: 'Recife – PE' },
  { nome: 'EMEI Ziraldo', cidade: 'Olinda – PE' },
  { nome: 'Escola Municipal Cecília Meireles', cidade: 'Salvador – BA' },
  { nome: 'CEI Ana Maria Machado', cidade: 'Campinas – SP' },
]
const RELATOS = [
  'Os alunos do 3º ano criaram um clube de leitura que se reúne toda sexta no espaço e já leu doze livros juntos.',
  'As famílias passaram a pegar livros emprestados no fim de semana, e a biblioteca virou ponto de encontro na saída.',
  'A roda de conversa sobre os livros do mês ajudou as turmas de alfabetização a ganhar confiança para ler em voz alta.',
]
const criados = { projetos: [], escolas: [], vinculos: [], respostas: [], plano: [] }

function cpfDemo() {
  const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  const dv = a => { const s = a.reduce((acc, x, i) => acc + x * (a.length + 1 - i), 0); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  d.push(dv(d)); d.push(dv(d))
  return d.join('')
}

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

// o nome de quem está logado aparece na saudação e no avatar: nos prints vira "Maria"
const anonimizar = page => page.evaluate(() => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n; (n = w.nextNode());) if (/Nat[aá]lia/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/Nat[aá]lia/g, 'Maria')
  document.querySelectorAll('.me').forEach(e => { e.textContent = 'MA' })
})

async function criarDemonstracao(admin) {
  const ok = (r, o) => { if (r.error) throw new Error(`${o}: ${r.error.message}`); return r.data }
  const projetos = ok(await admin.from('projects').insert([{ name: 'Biblioteca Viva', pronac: '123456' }, { name: 'Cantinho de Histórias', pronac: null }]).select('id, name'), 'projetos')
  criados.projetos = projetos.map(p => p.id)
  const escolas = ok(await admin.from('schools').insert(ESCOLAS).select('id, nome'), 'escolas')
  criados.escolas = escolas.map(e => e.id)
  const vinculos = ok(await admin.from('el_vinculos').insert(escolas.map((e, i) => ({ school_id: e.id, project_id: projetos[i % 2].id, patrocinador: PAT, inicio: '2026-05' }))).select('id'), 'vínculos')
  criados.vinculos = vinculos.map(v => v.id)
  const respostas = []
  ;['Junho', 'Julho', 'Agosto'].forEach((mes, m) => escolas.forEach((e, i) => {
    if (i === 3 && m > 0) return // uma escola parou de responder: aparece como ponto de atenção
    respostas.push({
      id: `demo-${m}-${i}`, origem: 'formulário', hash_origem: 'demo', carimbo: `2026-0${7 + m}-0${3 + i}T13:00:00Z`,
      projeto_informado: projetos[i % 2].name, escola_informada: e.nome, mes_informado: `${mes} de 2026`,
      visitas_texto: String(120 + i * 35 + m * 20), emprestimos_texto: String(60 + i * 12 + m * 9), atividades_texto: '',
      boas_praticas: (m + i) % 2 ? RELATOS[(m + i) % 3] : '', impacto_comunidade: (m + i) % 2 ? '' : RELATOS[(m + i + 1) % 3],
    })
  }))
  ok(await admin.from('el_respostas').insert(respostas), 'respostas')
  criados.respostas = respostas.map(r => r.id)
  const dia = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
  const plano = ok(await admin.from('plano_capacitacoes').insert([
    { project_id: projetos[0].id, school_id: escolas[0].id, patrocinador: PAT, tipo: 'Formação Espaço de Leitura', modo: 'Online', cidade: 'Recife', data_prevista: dia(-20), hora: '14:00', situacao: 'realizada', publico: 'Ensino Fundamental I' },
    { project_id: projetos[1].id, school_id: escolas[1].id, patrocinador: PAT, tipo: 'Sensibilização Pedagógica', modo: 'Presencial', cidade: 'Olinda', data_prevista: dia(9), hora: '09:00', publico: 'Educação Infantil' },
    { project_id: projetos[0].id, school_id: escolas[2].id, patrocinador: PAT, tipo: 'Formação Espaço de Leitura', modo: 'Online', cidade: 'Salvador', data_prevista: dia(16), hora: '15:30', publico: 'Fundamental I e II' },
    { project_id: projetos[1].id, school_id: escolas[3].id, patrocinador: PAT, tipo: 'Formação Espaço de Leitura', cidade: 'Campinas', publico: 'Educação Infantil e Fundamental I' },
    { project_id: projetos[1].id, patrocinador: PAT, tipo: 'Formação Espaço de Leitura', cidade: 'Natal', observacoes: 'instituição a definir' },
  ].map(i => ({ situacao: 'planejada', modo: null, hora: null, data_prevista: null, school_id: null, publico: null, observacoes: null, ...i }))).select('id'), 'plano')
  criados.plano = plano.map(p => p.id)
  return projetos
}

const browser = await chromium.launch({ channel: 'msedge', headless: false })
const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, deviceScaleFactor: 1.5, locale: 'pt-BR', colorScheme: 'light' })
const page = await ctx.newPage()
const admin = adminClient()
const print = async (nome, opts = {}) => {
  await pausa(opts.espera ?? 2400) // deixa as animações de caneta terminarem
  const p = opts.page ?? page
  if (!opts.page) await anonimizar(p)
  await p.screenshot({ path: fileURLToPath(new URL(`${nome}.png`, OUT)), fullPage: false })
  console.log(`  ✓ imagens/${nome}.png`)
}

try {
  await page.goto(`${SITE}/login`)
  console.log('\n>>> Faça o login na janela do Edge (seu usuário da Equipe). Aguardando...\n')
  await page.waitForURL(u => !new URL(u).pathname.startsWith('/login'), { timeout: 5 * 60_000 })
  const projetos = await criarDemonstracao(admin)

  await page.goto(SITE)
  await print('central', { espera: 3000 })

  // lista de demonstração no projeto fictício
  await page.goto(`${SITE}/listas/nova`)
  await page.locator('.pj', { hasText: 'Biblioteca Viva' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.fill('#title', DEMO.lista)
  await page.fill('#beneficiary_name', DEMO.escola)
  await page.fill('#beneficiary_cnpj', DEMO.cnpj)
  await page.fill('#city', 'Recife')
  await page.locator('.combo-list li').first().click()
  const agora = new Date(Date.now() - 10 * 60_000)
  const hh = d => d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  await page.fill('#start_time', hh(agora))
  await page.fill('#end_time', hh(new Date(agora.getTime() + 2 * 3600_000)))
  await page.fill('#instructor', DEMO.instrutora)
  await page.fill('#expected_count', '25')
  await print('criar-lista', { espera: 900 })
  await page.getByRole('button', { name: 'Gerar link' }).click()
  await page.getByText('Lista criada').waitFor()
  await print('link-e-qrcode', { espera: 2600 })
  const code = (await page.locator('.urlrow span').innerText()).trim().split('/').pop()

  const cel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' })
  const vol = await cel.newPage()
  await vol.goto(`${SITE}/p/${code}`)
  await vol.fill('#vName', DEMO.nome)
  await vol.fill('#vRole', 'Professora')
  await vol.fill('#vCpf', cpfDemo())
  await vol.locator('.sigpad canvas').scrollIntoViewIfNeeded()
  await assinar(vol)
  await vol.locator('.consent input').check()
  await vol.evaluate(() => window.scrollTo(0, 0))
  await print('celular-assinatura', { page: vol, espera: 900 })
  await vol.getByRole('button', { name: 'Confirmar presença' }).click()
  await vol.getByText('Presença confirmada').waitFor()
  await cel.close()

  const { data: lista } = await admin.from('trainings').select('id, school_id').eq('code', code).single()
  await page.goto(`${SITE}/listas/${lista.id}`)
  // mostra a chave nova: encerra e reabre (por 48 h), para aparecer "Aberta até …"
  const chave = page.getByRole('switch', { name: 'Aceitando presenças' })
  await chave.click()
  await page.getByText('Lista encerrada').first().waitFor()
  await chave.click()
  await page.getByText(/Aberta até/).waitFor()
  await print('lista-acompanhamento', { espera: 2500 })
  await page.goto(`${SITE}/imprimir/${lista.id}`)
  await print('documento', { espera: 1500 })

  // plano: um item ligado à lista de demonstração (participação confirmada)
  const { data: ligado } = await admin.from('plano_capacitacoes').insert({ project_id: projetos[0].id, school_id: lista.school_id, training_id: lista.id,
    patrocinador: PAT, tipo: DEMO.lista, cidade: 'Recife', data_prevista: new Date().toISOString().slice(0, 10), publico: 'Professores' }).select('id').single()
  criados.plano.push(ligado.id)
  await page.goto(`${SITE}/plano?pat=${encodeURIComponent(PAT_CHAVE)}`)
  await pausa(2000)
  await page.evaluate(() => document.querySelector('.av-chips')?.remove()) // os filtros listam os patrocinadores reais
  await print('plano', { espera: 800 })

  // Escolas não tem filtro: ficam só as linhas fictícias
  await page.goto(`${SITE}/espacos/escolas`)
  await pausa(2000)
  await page.evaluate(nomes => {
    document.querySelectorAll('.es-tbl tbody tr').forEach(tr => { if (!nomes.some(n => tr.innerText.includes(n))) tr.remove() })
    const p = document.querySelector('.head p')
    if (p) p.textContent = `${nomes.length} escolas em acompanhamento, em 2 projetos. Uma escola em dois projetos responde duas vezes.`
  }, ESCOLAS.map(e => e.nome))
  await print('espacos-escolas', { espera: 800 })

  await page.goto(`${SITE}/espacos/relatorios?p=${encodeURIComponent(PAT_CHAVE)}&de=2026-05&ate=2026-09`)
  await print('espacos-relatorio', { espera: 3000 })
} finally {
  const del = (t, ids) => (ids.length ? admin.from(t).delete().in('id', ids) : null)
  await del('plano_capacitacoes', criados.plano)
  const { data: demos } = await admin.from('trainings').select('id').eq('title', DEMO.lista)
  for (const d of demos ?? []) await admin.from('trainings').delete().eq('id', d.id)
  await admin.from('attendances').delete().eq('full_name', DEMO.nome)
  await del('el_respostas', criados.respostas)
  await del('el_vinculos', criados.vinculos)
  await del('schools', criados.escolas)
  await admin.from('schools').delete().eq('cnpj', DEMO.cnpj)
  await del('projects', criados.projetos)
  console.log('\nDemonstração apagada (lista, assinatura, escolas, projetos, respostas e plano fictícios).')
  await browser.close()
}
console.log(`Prints em ${fileURLToPath(OUT)}`)
