'use client'

import { useSettings } from '@/hooks/useSettings'
import type { Account } from '@/types/accounts'
import type { Settings } from '@/types/types'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

interface SettingsContextType {
  settings: Settings | null
  refresh: () => Promise<void>
  update: (newSettings: Partial<Settings>) => Promise<void>
  isLoading: boolean
  error: Error | null
  validateAccount: (account: Account) => Promise<boolean>
}

// Create the context
const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
)

interface SettingsProviderProps {
  children: ReactNode
}

export default function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings | null>(() => {
    const stored =
      typeof window !== 'undefined' ? localStorage.getItem('settings') : null
    return stored ? JSON.parse(stored) : null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { fetchSettings, updateSettings, validateAccount } = useSettings()

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchSettings()
      localStorage.setItem('settings', JSON.stringify(data))
      setSettings(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchSettings])

  const update = async (newSettings: Partial<Settings>) => {
    setIsLoading(true)
    setError(null)
    try {
      const updated = await updateSettings(newSettings)
      localStorage.setItem('settings', JSON.stringify(updated))
      setSettings(updated)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!settings) {
        await refresh()
      }

      if (
        (settings === null || !settings.hasOnboarded) &&
        window.location.pathname !== '/settings'
      ) {
        // Redirect to /settings
        console.log('Redirecting to /settings for onboarding')
        window.location.href = '/settings'
      }
    }
    checkOnboarding()
  }, [settings, settings?.hasOnboarded, refresh])

  const contextValue: SettingsContextType = {
    settings,
    refresh,
    update,
    isLoading,
    error,
    validateAccount,
  }

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettingsContext = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider')
  }
  return context
}
