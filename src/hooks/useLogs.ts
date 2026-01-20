import { LogFile, LogFileContent, LogsHookContext } from '@/types/logs'
import { useCallback, useState } from 'react'

export function useLogs(): LogsHookContext {
  const [logFiles, setLogFiles] = useState<LogFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchLogFiles = useCallback(async (): Promise<LogFile[]> => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/logs')
      if (!response.ok) {
        throw new Error('Failed to fetch log files')
      }
      const data = await response.json()
      setLogFiles(data.files)
      return data.files
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLogFileContent = useCallback(
    async (filename: string): Promise<LogFileContent> => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/logs?file=${encodeURIComponent(filename)}`,
        )
        if (!response.ok) {
          throw new Error(`Failed to fetch log file: ${filename}`)
        }
        const data: LogFileContent = await response.json()
        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const deleteLogFile = useCallback(async (filename: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/logs?file=${encodeURIComponent(filename)}`,
        {
          method: 'DELETE',
        },
      )
      if (!response.ok) {
        throw new Error(`Failed to delete log file: ${filename}`)
      }
      // Update the local state to remove the deleted file
      setLogFiles((prev) => prev.filter((log) => log.filename !== filename))
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    logFiles,
    loading,
    error,
    fetchLogFiles,
    fetchLogFileContent,
    deleteLogFile,
  }
}
