import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Todas as páginas são dinâmicas (dados do Supabase), então não precisamos de cache em R2.
export default defineCloudflareConfig()
