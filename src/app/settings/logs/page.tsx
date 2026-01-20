'use client'

import { Button } from '@/components/ui/forms'
import { useLogs } from '@/hooks/useLogs'
import type { LogFile } from '@/types/logs'
import { ArrowLeft, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function LogsPage() {
  const { logFiles, loading, error, fetchLogFiles, fetchLogFileContent } =
    useLogs()
  const [selectedLog, setSelectedLog] = useState<{
    filename: string
    content: string
  } | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    fetchLogFiles()
  }, [fetchLogFiles])

  const handleLogClick = async (logFile: LogFile) => {
    setLoadingContent(true)
    try {
      const content = await fetchLogFileContent(logFile.filename)
      setSelectedLog(content)
    } catch (err) {
      console.error('Error fetching log content:', err)
    } finally {
      setLoadingContent(false)
    }
  }

  const handleBack = () => {
    setSelectedLog(null)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (selectedLog) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={loadingContent}
          >
            <ArrowLeft size={16} /> Back to List
          </Button>
          <h1 className="text-2xl font-bold">{selectedLog.filename}</h1>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto">
          <pre className="text-xs font-mono whitespace-pre-wrap break-words">
            {selectedLog.content}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Log Files</h1>
      <p className="mb-4 text-gray-600 dark:text-gray-400">
        View application log files. Click on a log file to see its contents.
      </p>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
          Error: {error.message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading logs...</div>
      ) : logFiles.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No log files found.
        </div>
      ) : (
        <div className="space-y-2">
          {logFiles.map((logFile) => (
            <button
              key={logFile.filename}
              onClick={() => handleLogClick(logFile)}
              disabled={loadingContent}
              className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText
                    size={20}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {logFile.filename}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {logFile.date} • {formatFileSize(logFile.size)}
                    </div>
                  </div>
                </div>
                <div className="text-blue-600 dark:text-blue-400">→</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
