'use client'

import { wait } from '@/helpers/utils'
import { useDrafts, type DraftFilters } from '@/hooks/useDrafts'
import type { CreateDraftInput, DraftPost } from '@/types/drafts'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

interface DraftsContextType {
  drafts: DraftPost[]
  isLoading: boolean
  filters: DraftFilters
  error: Error | null
  addFilter: (prop: keyof DraftFilters, value: string) => void
  removeFilter: (prop: keyof DraftFilters) => void
  clearFilters: () => void
  refresh: () => Promise<void>
  createDraft: (input: CreateDraftInput) => Promise<DraftPost>
  getDraft: (id: string, group?: string) => Promise<DraftPost | null>
  updateDraft: (id: string, input: Partial<CreateDraftInput>) => Promise<void>
  deleteDraft: (id: string) => Promise<void>
  duplicateDraft: (id: string) => Promise<DraftPost>
  publishDraft: (id: string, accountIds: string[]) => Promise<DraftPost>
}

// Create the context
const DraftContext = createContext<DraftsContextType | undefined>(undefined)

interface DraftProviderProps {
  children: ReactNode
}

interface DraftState {
  hasInitialized: boolean
  drafts: DraftPost[]
  isLoading: boolean
  error: Error | null
}

export default function DraftProvider({ children }: DraftProviderProps) {
  const [filters, setFilters] = useState<DraftFilters>({
    group: null,
    searchTerm: null,
  })
  const [state, setState] = useState<DraftState>({
    hasInitialized: false,
    drafts: [],
    isLoading: false,
    error: null,
  })
  const { hasInitialized, drafts, isLoading, error } = state
  const [filteredDrafts, setFilteredDrafts] = useState<DraftPost[]>(drafts)

  const {
    createDraft,
    getDraft,
    updateDraft,
    fetchDrafts,
    deleteDraft,
    duplicateDraft,
    publishDraft,
  } = useDrafts()

  const filterDrafts = useCallback(
    (newDrafts: DraftPost[]) => {
      let filtered = newDrafts
      if (filters.group) {
        filtered = filtered.filter((d) => d.group === filters.group)
      }
      if (filters.searchTerm) {
        const lowerSearchTerm = filters.searchTerm.toLowerCase()
        filtered = filtered.filter((d) => {
          return (
            d.meta.slug.toLowerCase().includes(lowerSearchTerm) ||
            d.group.toLowerCase().includes(lowerSearchTerm) ||
            d.meta.text?.toLowerCase().includes(lowerSearchTerm)
          )
        })
      }
      setFilteredDrafts(filtered)
    },
    [filters]
  )

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const data = await fetchDrafts()
      await setState((prev) => ({ ...prev, drafts: data }))
      await filterDrafts(data)
    } catch (error) {
      await setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }))
    } finally {
      await setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [fetchDrafts, filterDrafts])

  useEffect(() => {
    const load = async () => {
      if (!hasInitialized) {
        await setState((prev) => ({ ...prev, hasInitialized: true }))
        await refresh()
      }
    }
    load()

    // Refresh drafts when page becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        wait(1000).then(() => refresh()) // slight delay to ensure visibility state is stable
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refresh, hasInitialized])

  const contextValue: DraftsContextType = {
    drafts: filteredDrafts,
    error,
    isLoading,
    filters,
    addFilter: async (prop, value) => {
      const newFilters = { ...filters, [prop]: value }
      await setFilters(newFilters)
      await setFilteredDrafts(
        drafts.filter((d) => {
          if (newFilters.group && d.group !== newFilters.group) return false
          if (newFilters.searchTerm) {
            const lowerSearchTerm = newFilters.searchTerm.toLowerCase()
            return (
              d.meta.slug.toLowerCase().includes(lowerSearchTerm) ||
              d.group.toLowerCase().includes(lowerSearchTerm) ||
              d.meta.text?.toLowerCase().includes(lowerSearchTerm)
            )
          }
          return true
        })
      )
    },
    removeFilter: async (prop) => {
      const newFilters = { ...filters, [prop]: null }
      await setFilters(newFilters)
      await setFilteredDrafts(
        drafts.filter((d) => {
          if (newFilters.group && d.group !== newFilters.group) return false
          if (newFilters.searchTerm) {
            const lowerSearchTerm = newFilters.searchTerm.toLowerCase()
            return (
              d.meta.slug.toLowerCase().includes(lowerSearchTerm) ||
              d.group.toLowerCase().includes(lowerSearchTerm) ||
              d.meta.text?.toLowerCase().includes(lowerSearchTerm)
            )
          }
          return true
        })
      )
    },
    clearFilters: async () => {
      const newFilters = { group: null, searchTerm: null }
      await setFilters(newFilters)
      await setFilteredDrafts(drafts)
    },
    refresh,
    createDraft,
    updateDraft: async (id: string, input: Partial<CreateDraftInput>) => {
      await updateDraft(id, input)
      await wait(1000) // slight delay to ensure server is updated
      await refresh()
    },
    getDraft,
    deleteDraft: async (id: string) => {
      await deleteDraft(id)
      await wait(1000) // slight delay to ensure server is updated
      await refresh()
    },
    duplicateDraft,
    publishDraft,
  }

  return (
    <DraftContext.Provider value={contextValue}>
      {children}
    </DraftContext.Provider>
  )
}

export const useDraftContext = () => {
  const context = useContext(DraftContext)
  if (context === undefined) {
    throw new Error('useDraftContext must be used within a DraftProvider')
  }
  return context
}
