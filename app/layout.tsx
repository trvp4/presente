import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, IBM_Plex_Mono, Caveat } from 'next/font/google'
import './globals.css'

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-sans' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' })
const hand = Caveat({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-hand' })

export const metadata: Metadata = {
  title: { default: 'Presente', template: '%s · Presente' },
  description: 'Listas de presença digitais para as capacitações de voluntários.',
}

export const viewport: Viewport = { themeColor: '#000000' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable} ${hand.variable}`}>
      <body>{children}</body>
    </html>
  )
}
