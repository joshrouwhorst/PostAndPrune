'use client'

import { useAppDataContext } from '@/providers/AppDataProvider'

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
  const { appData, isLoading: adLoading } = useAppDataContext()

  let lastBackup = getTimeString(appData?.lastBackup)
  let oldestBskyPostDate = getTimeString(appData?.oldestBskyPostDate)

  if (adLoading) {
    return (
      <div className="max-w-xs bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
        <div>Loading</div>
      </div>
    )
  }

  return (
    <div className="max-w-xs bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
      <div>Last Backup: {lastBackup}</div>
      <div>Total Posts: {appData?.totalPostsBackedUp || 0}</div>
      <div>Oldest Bsky Post: {oldestBskyPostDate}</div>
      <div>Bsky Posts: {appData?.postsOnBsky || 0}</div>
    </div>
  )
}
