import { Analytics } from '@vercel/analytics/next'
import { Lily_Script_One, Roboto_Slab, Roboto_Flex } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const lilyScript = Lily_Script_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-lily-script',
  display: 'swap',
})

const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  variable: '--font-roboto-slab',
  display: 'swap',
})

const robotoFlex = Roboto_Flex({
  subsets: ['latin'],
  variable: '--font-roboto-flex',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Auditeca · Audiolivros sincronizados',
  description: 'Leia e ouça seus audiolivros com sincronização de palavras.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0C161C' },
    { media: '(prefers-color-scheme: dark)', color: '#0C161C' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${lilyScript.variable} ${robotoSlab.variable} ${robotoFlex.variable}`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
