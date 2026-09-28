// Abre o assistente (scripts/assistente.sh) no Git Bash, que já vem com o Git para Windows.
// Uso: npm run assistente -- chave | turnstile | equipe | migracao
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./assistente.sh', import.meta.url))
const candidates = process.platform === 'win32'
  ? ['C:\\Program Files\\Git\\bin\\bash.exe', 'C:\\Program Files (x86)\\Git\\bin\\bash.exe']
  : ['/bin/bash', '/usr/bin/bash']
const bash = candidates.find(existsSync)
if (!bash) {
  console.error('Não encontrei o Git Bash. Instale o Git para Windows (git-scm.com) e tente de novo.')
  process.exit(1)
}
const { status } = spawnSync(bash, [script, ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(status ?? 1)
