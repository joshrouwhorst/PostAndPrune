import { Callout } from '@/components/ui/callout'
import SettingsForm from './components/SettingsForm'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <p className="mb-4">
        In order to be able to use the app, you need to set your social media
        credentials here. Bluesky accounts use username/password, while Threads
        accounts use OAuth authentication. All credentials are stored encrypted
        locally in the app-data folder.
      </p>
      <p className="mb-4">
        Also, you need to set the path to your backup folder. This is the folder
        where your backups and drafts will be stored. Example:
        /Users/username/Documents/BskyBackup
      </p>

      <h2 className="text-xl font-semibold mb-2">Logs</h2>
      <p className="mb-4">
        You can view the application logs in the Logs section. This can help you
        diagnose any issues you may encounter.{' '}
        <a href="/settings/logs" className="text-blue-600 dark:text-blue-400">
          View Logs
        </a>
      </p>
      <Callout variant="danger" className="mb-4">
        <p>
          Be careful! This app is still a work in progress. Only use an account
          you are ok with losing data on if something goes wrong.
        </p>
      </Callout>
      <SettingsForm />
    </div>
  )
}
