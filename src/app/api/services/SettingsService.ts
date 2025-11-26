import { getAccountInfo as getBskyAccountInfo } from '@/app/api-helpers/auth/BlueskyAuth'
import { DATA_LOCATION, DEFAULT_PRUNE_MONTHS } from '@/config/main'
import generateId from '@/helpers/generateId'
import type { Account } from '@/types/accounts'
import type { Settings } from '@/types/types'
import { getAppData, saveAppData } from '../../api-helpers/appData'
import Logger from '../../api-helpers/logger'
import CredentialService from './CredentialService'

const logger = new Logger('SettgServ')

const defaults: Settings = {
  backupLocation: DATA_LOCATION || '',
  pruneAfterMonths: DEFAULT_PRUNE_MONTHS ? Number(DEFAULT_PRUNE_MONTHS) : 3,
  autoBackupFrequencyMinutes: undefined,
  hasOnboarded: false,
  accounts: [],
}

init()
function init() {
  logger.log('SettingsService initialized.')
}

export async function getSettings(): Promise<Settings> {
  const appData = await getAppData()
  return appData.settings || defaults
}

export async function updateSettings(
  settings: Partial<Settings>
): Promise<Settings> {
  logger.log(`Updating settings.`, settings)
  const appData = await getAppData()
  const currentAccounts = appData.settings?.accounts || []

  appData.settings = {
    ...appData.settings,
    ...settings,
    hasOnboarded:
      settings.hasOnboarded ??
      appData.settings?.hasOnboarded ??
      defaults.hasOnboarded,
    accounts:
      settings.accounts ?? appData.settings?.accounts ?? defaults.accounts,
  }

  appData.settings.accounts.forEach(async (account) => {
    if (
      account.id.indexOf('new') === 0 ||
      !currentAccounts.find((a) => a.id === account.id)
    ) {
      await addAccount(account)
    } else {
      await updateAccount(account)
    }
  })

  const accountsToRemove = currentAccounts.filter(
    (account) => !appData.settings?.accounts.find((a) => a.id === account.id)
  )

  accountsToRemove.forEach(async (account) => {
    await removeAccount(account.id)
  })

  await saveAppData(appData)

  return getSettings()
}

export async function getAccounts() {
  const settings = await getSettings()
  return settings.accounts || []
}

export async function addAccount(account: Account) {
  account.id = generateId()
  if (account.credentials) {
    CredentialService.setCredentials(account, account.credentials)
  }

  if (account.platform === 'bluesky') {
    const profile = await getBskyAccountInfo(account)
    account.profile = profile
  }
}

export async function updateAccount(account: Account) {
  if (account.credentials) {
    await CredentialService.setCredentials(account, account.credentials)
  }

  if (account.platform === 'bluesky') {
    const profile = await getBskyAccountInfo(account)
    account.profile = profile
  }
}

export async function removeAccount(accountId: string) {
  const settings = await getSettings()
  const removalAccount = settings.accounts?.find(
    (account) => account.id === accountId
  )
  if (!removalAccount) {
    throw new Error(`Account with ID ${accountId} not found.`)
  }

  await CredentialService.removeCredentials(removalAccount)
}

export async function updateAccountProfiles(): Promise<void> {
  const settings = await getSettings()
  for (const account of settings.accounts || []) {
    if (account.platform === 'bluesky') {
      try {
        const profile = await getBskyAccountInfo(account)
        account.profile = profile
        logger.log(`Updated profile for account ${account.id}`)
      } catch (error) {
        logger.error(
          `Failed to update profile for account ${account.id}:`,
          error
        )
      }
    }
  }
  await updateSettings({ accounts: settings.accounts })
}
