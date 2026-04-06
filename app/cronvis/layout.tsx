import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://404tools.dev/cronvis',
  },
}

export default function CronvisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
