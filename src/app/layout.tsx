import type { Metadata } from 'next'

declare module '*.css'

import HeaderNav from '@/components/HeaderNav'
import AppDataProvider from '@/providers/AppDataProvider'
import { ModalProvider } from '@/providers/ModalProvider'
import SettingsProvider from '@/providers/SettingsProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'BskyBackup',
  description: 'A simple app to backup and manage your Bluesky posts locally.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`min-h-screen`}>
        <HeaderNav />
        <div className="container mx-auto px-4 py-6">
          {/* Main content area */}
          <AppDataProvider>
            <SettingsProvider>
              <ModalProvider>{children}</ModalProvider>
            </SettingsProvider>
          </AppDataProvider>
        </div>
      </body>
    </html>
  )
}
