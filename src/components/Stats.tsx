'use client'

import { useBackupContext } from '@/providers/BackupProvider'

const getTimeString = (dateString: string | null | undefined) => {
  if (!dateString) return 'Never'
  const now = new Date()
  const backupDate = new Date(dateString)
  const diffInMs = now.getTime() - backupDate.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)
  const diffInWeeks = Math.floor(diffInDays / 7)

  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))

  if (diffInWeeks > 0) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`
  } else if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

export default function Stats() {
  const { backupData, isLoading: backupLoading } = useBackupContext()

  console.log('Backup Data in Stats:', backupData)

  let lastBackup = getTimeString(backupData?.lastBackupDate)
  const accountsBackedUp = backupData?.backups.length
  const postsBackedUp = backupData?.backups.reduce(
    (sum, acc) => sum + acc.totalPosts,
    0
  )

  if (backupLoading) {
    return (
      <div className="max-w-xs bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
        <div>Loading</div>
      </div>
    )
  }

  return (
    <div className="max-w-xs bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
      <div>Last Backup: {lastBackup}</div>
      <div>Total Posts: {postsBackedUp || 0}</div>
      <div>Accounts Backed Up: {accountsBackedUp || 0}</div>
      <div>
        {backupData?.backups.map((accountBackup) => (
          <div key={accountBackup.account.id} className="mt-2">
            <strong>{accountBackup.account.name}</strong>:{' '}
            {accountBackup.totalPosts} posts
          </div>
        ))}
      </div>
    </div>
  )
}
