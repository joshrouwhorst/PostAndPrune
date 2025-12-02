import BackupPostList from '@/components/BackupPostList'
import BackupToolBar from '@/components/BackupToolBar'
import Stats from '@/components/Stats'
import Link from '@/components/ui/link'
import TwoColumn from '@/components/ui/TwoColumn'
import BackupProvider from '@/providers/BackupProvider'
import DraftProvider from '@/providers/DraftsProvider'

export default async function Home() {
  return (
    <DraftProvider>
      <BackupProvider>
        <TwoColumn reverseStack stackPoint="md">
          <TwoColumn.Main>
            <BackupToolBar />
            <BackupPostList />
          </TwoColumn.Main>
          <TwoColumn.Side>
            <h1 className="text-2xl font-bold mb-4">Backup</h1>
            <p className="mb-4">
              This tool helps you back up your posts from Bluesky to your local
              filesystem at the Backup Location in{' '}
              <Link href="/settings">Settings</Link>.
            </p>

            <p className="mb-4">
              The prune button will perform a backup then will delete any posts
              on your Bluesky account older than the number of months you
              specify in Settings.
            </p>
            <Stats />
          </TwoColumn.Side>
        </TwoColumn>
      </BackupProvider>
    </DraftProvider>
  )
}
