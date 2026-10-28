import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: '#F95738',
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
    <div className="brand-portal-scope min-h-screen font-sans antialiased text-[#1a1c1c] selection:bg-[#F95738]/25 selection:text-[#F95738]">
      {children}
    </div>
  )
}

