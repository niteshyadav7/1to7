import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-brand-inter',
})

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    template: '%s | TheHype',
    default: 'TheHype | Enterprise Brand Portal',
  },
  description: 'TheHype Influencer Marketing & Creator Shortlist Review Portal. Zero spreadsheets, real-time connected.',
  applicationName: 'TheHype Brand Portal',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TheHype Brand Portal',
  },
  icons: {
    icon: [
      { url: '/thehype-logo.png', type: 'image/png' },
    ],
    shortcut: '/thehype-logo.png',
    apple: '/thehype-logo.png',
  },
}

export default function BrandRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${inter.variable} ${inter.className} brand-portal-scope min-h-screen antialiased text-slate-900 selection:bg-[#10b981]/20 selection:text-[#10b981]`}
      style={{
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {children}
    </div>
  )
}

