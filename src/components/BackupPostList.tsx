'use client'

import PostList from '@/components/PostList'
import { useAppStateContext } from '@/providers/AppStateProvider'
import { useBackupContext } from '@/providers/BackupProvider'

export default function BackupPostList() {
  const { selectedAccount: account } = useAppStateContext()
  const { backupData, isLoading } = useBackupContext()

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
        <h2 className="text-lg font-semibold mb-2">No account selected</h2>
        <p className="mb-4">
          Use the{' '}
          <span className="font-semibold text-green-600">green button</span> in
          the toolbar to start a backup.
        </p>
      </div>
    )
  }

  const backupForAccount = backupData?.backups.find(
    (backup) => backup.account.id === account.id
  )

  const posts = backupForAccount?.posts || []

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
        <h2 className="text-lg font-semibold mb-2">Loading backup...</h2>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
        <h2 className="text-lg font-semibold mb-2">No posts found</h2>
        <p className="mb-4">Start a backup to see your posts here.</p>
      </div>
    )
  }

  return <PostList posts={posts} isLoading={isLoading} />
}
