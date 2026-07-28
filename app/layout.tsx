import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { MotionProvider } from '@/components/shared/motion-provider'
import { SITE } from '@/lib/content/site'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: SITE.title,
  description: SITE.description,
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  // public/ paths are not basePath-prefixed for us — see next.config.mjs
  icons: {
    icon: [
      { url: '/residency/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/residency/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/residency/apple-icon.png',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <MotionProvider>{children}</MotionProvider>
        <Toaster />
      </body>
    </html>
  )
}
