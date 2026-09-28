# Hospedagem na Cloudflare Workers (OpenNext), não na Vercel

O Next.js roda na Cloudflare Workers pelo adaptador OpenNext. O plano gratuito permite uso comercial, não "dorme" (o Voluntário abre o QR code e a página responde na hora) e tem agendador. A Vercel foi descartada porque o plano Hobby proíbe uso comercial e o Pro custa cerca de US$ 20/mês. Render e Railway gratuitos "dormem", o que é ruim para o QR code no dia da Capacitação.

## Consequences

- Um cron diário (`custom-worker.ts`, 9h de Brasília) consulta o banco para o Supabase gratuito não pausar o projeto depois de 7 dias sem uso. As Capacitações são pouco frequentes, então sem isso o Link de Presença poderia estar fora do ar no dia.
- O `proxy.ts` (antigo middleware) usa o runtime Node, que o OpenNext marca como experimental na Cloudflare. Por isso a autorização **não** depende só dele: o layout do painel e cada rota exportadora conferem a Equipe de novo.
- Recursos específicos da Cloudflare (limite de envios `SIGN_LIMITER`, Turnstile) não existem no `next dev`; o código os ignora fora da Cloudflare.
- Para publicar: `npx opennextjs-cloudflare build && npx wrangler deploy`.
