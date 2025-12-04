import {
  checkIfExists,
  createDirectory,
  deleteFileOrDirectory,
  moveFileOrDirectory,
} from '../../app/api/services/FileService.js'
import { getPaths } from '../../config/main.js'
import generateId from '../../helpers/generateId.js'
import type { Account } from '../../types/accounts.js'
import type { Schedule } from '../../types/scheduler.js'
import type { MigrationContext } from '../umzug.js'

export async function up({ service }: MigrationContext) {
  console.log('Migrating to 0.2.0: Adding multi-account support')
  const appData = await service.getAppData()

  // If accounts field doesn't exist, create it with default account
  if (appData?.settings && !appData.settings.accounts) {
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
      // biome-ignore lint/suspicious/noExplicitAny: Needs to be generic
    } as any
    appData.settings.accounts = [defaultAccount]
    delete appData.settings.bskyIdentifier
    delete appData.settings.bskyPassword
    delete appData.settings.bskyDisplayName
    console.log('Added bluesky account to app data.')

    // Save updated app data back to file
    await service.saveAppData(appData)
    console.log('App data accounts field updated with multi-account support.')
  }

  // Migrate existing backup files to new multi-account format
  const { backupPath } = getPaths()
  const backupFileExists = await checkIfExists(
    `${backupPath}/bluesky-posts.json`,
  )
  if (backupFileExists) {
    const account = appData.settings?.accounts?.[0]
    if (!account) return
    await createDirectory(`${backupPath}/${account.id}`)
    await moveFileOrDirectory(
      `${backupPath}/bluesky-posts.json`,
      `${backupPath}/${account.id}/posts.json`,
    )
    await moveFileOrDirectory(
      `${backupPath}/media`,
      `${backupPath}/${account.id}/media`,
    )
  }

  // Migrate existing schedules to new multi-account format
  if (appData.schedules) {
    appData.schedules = appData.schedules?.map((schedule: Schedule) => {
      schedule.accounts = appData.settings?.accounts || []
      return schedule
    })
    await service.saveAppData(appData)
    console.log('Schedules updated with multi-account support.')
  }
}

export async function down({ service }: MigrationContext) {
  console.log('Reverting migration to 0.2.0: Removing multi-account support')
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
    await service.saveAppData(appData)
    console.log('App data reverted to single-account support.')
  }

  // Migrate existing backup files back to single-account format
  const { backupPath } = getPaths()
  const account = appData.settings?.accounts?.[0]
  if (account) {
    const accountBackupPath = `${backupPath}/${account.id}`
    const accountBackupDirExists = await checkIfExists(accountBackupPath)
    if (accountBackupDirExists) {
      await moveFileOrDirectory(
        `${accountBackupPath}/posts.json`,
        `${backupPath}/bluesky-posts.json`,
      )
      await moveFileOrDirectory(
        `${accountBackupPath}/media`,
        `${backupPath}/media`,
      )
      await deleteFileOrDirectory(accountBackupPath)
      console.log('Backup files reverted to single-account format.')
    }
  }

  // Revert existing schedules to single-account format
  if (appData?.schedules) {
    appData.schedules = appData.schedules?.map((schedule: Schedule) => {
      if (schedule.accounts) schedule.accounts = []
      return schedule
    })
    await service.saveAppData(appData)
    console.log('Schedules reverted to single-account support.')
  }
}
