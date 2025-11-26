import type { BackupData } from '@/types/types'
import { useCallback, useEffect, useState } from 'react'

export function useBackup() {
  const [backup, setBackup] = useState<BackupData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchBackup = useCallback(async () => {
    const response = await fetch('/api/backup')
    if (!response.ok) {
      throw new Error('Failed to fetch backup data')
    }
    const data: BackupData = await response.json()
    return data
  }, [])

  const runBackup = useCallback(async () => {
    setLoading(true)
    const response = await fetch('/api/backup', {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error('Failed to run backup')
    }
    setLoading(false)
  }, [])

  const pruneBsky = useCallback(async () => {
    setLoading(true)
    const response = await fetch('/api/prune', {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error('Failed to prune data')
    }
    setLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBackup()
      setBackup(data)
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [fetchBackup])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { backup, loading, error, refresh, runBackup, pruneBsky }
}
