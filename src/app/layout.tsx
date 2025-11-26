import type { Metadata } from 'next'

declare module '*.css'

import HeaderNav from '@/components/HeaderNav'
import { SITE_DESCRIPTION, SITE_ICON, SITE_TITLE } from '@/config/frontend'
import AppDataProvider from '@/providers/AppDataProvider'
import AppStateProvider from '@/providers/AppStateProvider'
import { ModalProvider } from '@/providers/ModalProvider'
import SettingsProvider from '@/providers/SettingsProvider'
import './globals.css'

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: SITE_ICON,
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
          <AppStateProvider>
            <AppDataProvider>
              <SettingsProvider>
                <ModalProvider>{children}</ModalProvider>
              </SettingsProvider>
            </AppDataProvider>
          </AppStateProvider>
        </div>
      </body>
    </html>
  )
}
