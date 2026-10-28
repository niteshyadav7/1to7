import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Influencer Pitch Deck | TheHype',
  description: 'Curated creator proposal and talent shortlist deck prepared by TheHype.',
  icons: {
    icon: '/thehype-logo.png',
    shortcut: '/thehype-logo.png',
    apple: '/thehype-logo.png',
  },
}

export default function RosterViewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

