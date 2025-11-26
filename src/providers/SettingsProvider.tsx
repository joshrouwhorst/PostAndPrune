'use client'

import { useSettings } from '@/hooks/useSettings'
import type { Account } from '@/types/accounts'
import type { Settings } from '@/types/types'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
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
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasInitialServerFetch, setHasInitialServerFetch] = useState(false)

  const { fetchSettings, updateSettings, validateAccount } = useSettings()

  // Load from localStorage immediately on mount
  useEffect(() => {
    const stored = localStorage.getItem('settings')
    if (stored) {
      try {
        setSettings(JSON.parse(stored))
      } catch (err) {
        console.error('Failed to parse stored settings:', err)
        localStorage.removeItem('settings')
      }
    }
    setIsHydrated(true)
  }, [])

  // Separate effect to fetch from server asynchronously (only once)
  useEffect(() => {
    if (!isHydrated || hasInitialServerFetch) return

    const fetchFromServer = async () => {
      try {
        const data = await fetchSettings()
        localStorage.setItem('settings', JSON.stringify(data))
        setSettings(data)
        setHasInitialServerFetch(true)
      } catch (err) {
        console.error('Failed to fetch settings from server:', err)
        setError(err as Error)
        setHasInitialServerFetch(true) // Still mark as attempted to prevent retry loops
      }
    }

    fetchFromServer()
  }, [isHydrated, hasInitialServerFetch, fetchSettings])

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

  // Handle onboarding redirect - only after hydration and initial server fetch attempt
  useEffect(() => {
    if (!isHydrated || !hasInitialServerFetch) return

    if (
      (settings === null || !settings.hasOnboarded) &&
      window.location.pathname !== '/settings'
    ) {
      // Redirect to /settings
      console.log('Redirecting to /settings for onboarding')
      window.location.href = '/settings'
    }
  }, [settings, settings?.hasOnboarded, isHydrated, hasInitialServerFetch])

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
