import { useCallback } from 'react'

interface GroupHookContext {
  fetchGroups: () => Promise<string[]>
  reorderGroupPosts: (groupId: string, draftPostIds: string[]) => Promise<void>
}

export function useGroups(): GroupHookContext {
  const fetchGroups = useCallback(async () => {
    const response = await fetch('/api/groups')
    if (!response.ok) {
      throw new Error('Failed to fetch group data')
    }
    const data: string[] = await response.json()
    return data
  }, [])

  const reorderGroupPosts = useCallback(
    async (groupId: string, draftPostIds: string[]) => {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draftPostIds }),
      })
      if (!response.ok) {
        throw new Error('Failed to reorder posts in group')
      }
      return response.json()
    },
    [],
  )

  return { fetchGroups, reorderGroupPosts }
}
