'use client'

import type { Account } from '@/types/accounts'
import {
  getCookie as getClientCookie,
  setCookie as setClientCookie,
} from 'cookies-next'
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

interface AppState {
  selectedAccount: Account | null
}

interface AppStateWithActions extends AppState {
  setSelectedAccount: (account: Account | null) => void
}

// Cookie key for app state
const APP_STATE_COOKIE_KEY = 'pnp-app-state'
// Helper functions for cookie management
const setCookie = (name: string, value: string, days = 30) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  setClientCookie(name, value, { expires, path: '/' })
}

const getCookie = (name: string): string | null => {
  const value = getClientCookie(name)
  return value ? String(value) : null
}

const saveAppStateToCookie = (appState: AppState) => {
  try {
    const stateJson = JSON.stringify(appState)
    setCookie(APP_STATE_COOKIE_KEY, stateJson)
  } catch (error) {
    console.error('Failed to save app state to cookie:', error)
  }
}

const loadAppStateFromCookie = (): AppState => {
  try {
    const stateJson = getCookie(APP_STATE_COOKIE_KEY)
    if (stateJson) {
      return JSON.parse(stateJson)
    }
  } catch (error) {
    console.error('Failed to load app state from cookie:', error)
  }
  return { selectedAccount: null }
}

// Create the context
const AppStateContext = createContext<AppStateWithActions | undefined>(
  undefined
)

interface AppStateProviderProps {
  children: ReactNode
}

export default function AppStateProvider({ children }: AppStateProviderProps) {
  const [appState, setAppState] = useState<AppState>({ selectedAccount: null })
  const [isLoaded, setIsLoaded] = useState(false)

  // Load state from cookie on mount
  useEffect(() => {
    const savedState = loadAppStateFromCookie()
    setAppState(savedState)
    setIsLoaded(true)
  }, [])

  // Save state to cookie whenever it changes
  useEffect(() => {
    if (isLoaded) {
      saveAppStateToCookie(appState)
    }
  }, [appState, isLoaded])

  const setSelectedAccount = (account: Account | null) => {
    setAppState((prev) => ({
      ...prev,
      selectedAccount: account,
    }))
  }

  const contextValue: AppStateWithActions = {
    selectedAccount: appState.selectedAccount,
    setSelectedAccount,
  }

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  )
}

export const useAppStateContext = () => {
  const context = useContext(AppStateContext)
  if (context === undefined) {
    throw new Error(
      'useAppStateContext must be used within an AppStateProvider'
    )
  }
  return context
}
