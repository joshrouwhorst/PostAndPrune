import type { CreateDraftInput, DraftPost } from '@/types/drafts'
import { useCallback } from 'react'

export interface DraftFilters {
  group: string | null
  searchTerm: string | null
}

interface DraftHookContext {
  fetchDrafts: (filters?: DraftFilters) => Promise<DraftPost[]>
  createDraft: (input: CreateDraftInput) => Promise<DraftPost>
  getDraftsInGroup: (group: string) => Promise<DraftPost[]>
  getDraftsInSchedule: (scheduleId: string) => Promise<DraftPost[]>
  getDraft: (id: string, group?: string) => Promise<DraftPost | null>
  updateDraft: (
    id: string,
    input: Partial<CreateDraftInput>
  ) => Promise<DraftPost | null>
  deleteDraft: (id: string) => Promise<void>
  duplicateDraft: (id: string) => Promise<DraftPost>
  publishDraft: (id: string, accountIds: string[]) => Promise<DraftPost>
  deleteMediaFromDraft: (mediaFileUrl: string) => Promise<void>
}

export function useDrafts(): DraftHookContext {
  const fetchDrafts = useCallback(async (filters?: DraftFilters) => {
    const query = new URLSearchParams()
    if (filters?.group) {
      query.append('group', filters.group)
    }
    if (filters?.searchTerm) {
      query.append('searchTerm', filters.searchTerm)
    }
    const url = query.toString()
      ? `/api/drafts?${query.toString()}`
      : '/api/drafts'
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to fetch draft data')
    }
    const data: DraftPost[] = await response.json()
    return data
  }, [])

  const createDraft = useCallback(async (input: CreateDraftInput) => {
    try {
      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        throw new Error('Failed to create draft')
      }
      const data: DraftPost = await response.json()

      return data
    } catch (error) {
      throw error
    }
  }, [])

  const getDraftsInGroup = useCallback(async (group: string) => {
    try {
      const response = await fetch(
        `/api/drafts?group=${encodeURIComponent(group)}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch drafts for group')
      }
      const data: DraftPost[] = await response.json()
      return data
    } catch (error) {
      throw error
    }
  }, [])

  const getDraftsInSchedule = useCallback(async (scheduleId: string) => {
    try {
      const response = await fetch(
        `/api/drafts?scheduleId=${encodeURIComponent(scheduleId)}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch drafts for schedule')
      }
      const data: DraftPost[] = await response.json()
      return data
    } catch (error) {
      throw error
    }
  }, [])

  const getDraft = useCallback(async (id: string, group?: string) => {
    try {
      const searchParams = group ? `?group=${encodeURIComponent(group)}` : ''
      const response = await fetch(
        `/api/drafts/${encodeURIComponent(id)}${searchParams}`
      )
      if (response.status === 404) {
        return null
      }
      if (!response.ok) {
        throw new Error('Failed to fetch draft')
      }
      const data: DraftPost = await response.json()
      return data
    } catch (error) {
      throw error
    }
  }, [])

  const updateDraft = useCallback(
    async (id: string, input: Partial<CreateDraftInput>) => {
      try {
        const response = await fetch(`/api/drafts/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        })
        if (response.status === 404) {
          return null
        }
        if (!response.ok) {
          throw new Error('Failed to update draft')
        }
        return await response.json()
      } catch (error) {
        throw error
      }
    },
    []
  )

  const deleteDraft = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/drafts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete draft')
      }
    } catch (error) {
      throw error
    }
  }, [])

  const duplicateDraft = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `/api/drafts/${encodeURIComponent(id)}?duplicate=true`,
        {
          method: 'POST',
        }
      )
      if (!response.ok) {
        throw new Error('Failed to duplicate draft')
      }
      const data: DraftPost = await response.json()
      return data
    } catch (error) {
      throw error
    }
  }, [])

  const publishDraft = useCallback(
    async (id: string, accountIds: string[]) => {
      try {
        const accountParams = accountIds
          .map((accountId) => `accountIds=${encodeURIComponent(accountId)}`)
          .join('&')
        const url = `/api/drafts/${encodeURIComponent(
          id
        )}?publish=true&${accountParams}`

        const response = await fetch(url, {
          method: 'POST',
        })
        if (!response.ok) {
          throw new Error('Failed to publish draft')
        }

        // The API returns a success message, but we need to fetch the updated draft
        const updatedDraft = await getDraft(id)
        if (!updatedDraft) {
          throw new Error('Failed to fetch updated draft after publishing')
        }

        return updatedDraft
      } catch (error) {
        throw error
      }
    },
    [getDraft]
  )

  const deleteMediaFromDraft = useCallback(async (mediaFileUrl: string) => {
    try {
      const response = await fetch(mediaFileUrl, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete media from draft')
      }
    } catch (error) {
      throw error
    }
  }, [])

  return {
    fetchDrafts,
    createDraft,
    getDraftsInGroup,
    getDraftsInSchedule,
    getDraft,
    updateDraft,
    deleteDraft,
    duplicateDraft,
    publishDraft,
    deleteMediaFromDraft,
  }
}
