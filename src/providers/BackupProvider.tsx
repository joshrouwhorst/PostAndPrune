'use client'

import { useBackup } from '@/hooks/useBackup'
import type { BackupData } from '@/types/types'
import { createContext, type ReactNode, useContext, useState } from 'react'

interface BackupContextType {
  backupData: BackupData | null
  isLoading: boolean
  filters: {
    hasMedia: boolean | null
    mediaType: string | null
  }
  addFilter: () => void
  removeFilter: () => void
  clearFilters: () => void
  refresh: () => Promise<void>
  runBackup: () => Promise<void>
  pruneBsky: () => Promise<void>
}

// Create the context
const BackupContext = createContext<BackupContextType | undefined>(undefined)

interface BackupProviderProps {
  children: ReactNode
}

export default function BackupProvider({ children }: BackupProviderProps) {
  const [filters] = useState<{
    hasMedia: boolean | null
    mediaType: string | null
  }>({
    hasMedia: null,
    mediaType: null,
  })
  const { backup, loading, refresh, runBackup, pruneBsky } = useBackup()
  const contextValue: BackupContextType = {
    backupData: backup,
    isLoading: loading,
    filters,
    addFilter: () => {
      // Implement filter logic
    },
    removeFilter: () => {
      // Implement filter removal logic
    },
    clearFilters: () => {
      // Implement clear filters logic
    },
    refresh,
    runBackup,
    pruneBsky,
  }

  return (
    <BackupContext.Provider value={contextValue}>
      {children}
    </BackupContext.Provider>
  )
}

export const useBackupContext = () => {
  const context = useContext(BackupContext)
  if (context === undefined) {
    throw new Error('useBackupContext must be used within a BackupProvider')
  }
  return context
}
