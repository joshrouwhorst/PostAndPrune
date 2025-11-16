import type { MigrationService } from '@/app/api/services/MigrationService'
import { APP_DATA_FILE } from '@/config/main'
import generateId from '@/helpers/generateId'
import type { Account } from '@/types/accounts'

async function up(service: MigrationService) {
  // Example migration: Add a new field to app metadata
  if (!service.isPreviousVersionLessThan('0.1.1')) return
  console.log('Migrating to 0.1.1: Adding multi-account support')
  const appData = await service.getAppData()

  // If accounts field doesn't exist, create it with default account
  if (
    !appData.settings?.accounts &&
    appData.settings.blueskyIdentifier &&
    appData.settings.blueskyPassword
  ) {
    const defaultAccount: Account = {
      id: generateId(),
      name: 'Bluesky',
      platform: 'bluesky',
      createdAt: new Date().toISOString(),
      credentials: {
        bluesky: {
          identifier: appData.settings.bskyIdentifier || '',
          password: appData.settings.bskyPassword || '',
          displayName: appData.settings.bskyDisplayName || '',
        },
      },
      isActive: true,
    }
    appData.settings.accounts = [defaultAccount]
    console.log('Added bluesky account to app data.')

    // Save updated app data back to file
    const fs = await import('fs').then((mod) => mod.promises)
    await fs.writeFile(APP_DATA_FILE, JSON.stringify(appData, null, 2))
    console.log('App data updated with multi-account support.')
  }
}

async function down(service: MigrationService) {
  // Example rollback: Remove the new field from app metadata
  if (!service.isPreviousVersionGreaterThan('0.1.0')) return
  console.log('Reverting migration to 0.1.0: Removing multi-account support')
  const appData = await service.getAppData()

  // Remove accounts field and restore single account fields
  if (appData.settings?.accounts && appData.settings.accounts.length > 0) {
    const defaultAccount = appData.settings.accounts[0]
    if (defaultAccount.platform === 'bluesky') {
      appData.settings.bskyIdentifier =
        defaultAccount.credentials.bluesky.identifier
      appData.settings.bskyPassword =
        defaultAccount.credentials.bluesky.password
      appData.settings.bskyDisplayName =
        defaultAccount.credentials.bluesky.displayName
      console.log('Restored bluesky single account fields in app data.')
    }
    delete appData.settings.accounts

    // Save updated app data back to file
    const fs = await import('fs').then((mod) => mod.promises)
    await fs.writeFile(APP_DATA_FILE, JSON.stringify(appData, null, 2))
    console.log('App data reverted to single-account support.')
  }
}

module.exports = {
  up,
  down,
}
