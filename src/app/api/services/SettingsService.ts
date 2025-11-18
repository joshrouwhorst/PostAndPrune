import { DATA_LOCATION, DEFAULT_PRUNE_MONTHS } from '@/config/main'
import type { Account } from '@/types/accounts'
import type { Settings } from '@/types/types'
import { getAppData, saveAppData } from '../../api-helpers/appData'
import Logger from '../../api-helpers/logger'

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

  // Generate ID for new records
  appData.settings.accounts = appData.settings.accounts.map((account) => ({
    ...account,
    id:
      !account.id || account.id.indexOf('new') === 0
        ? crypto.randomUUID()
        : account.id,
  }))

  await saveAppData(appData)

  return getSettings()
}

export async function getAccounts() {
  const settings = await getSettings()
  return settings.accounts || []
}

export async function addAccount(account: Account) {
  const settings = await getSettings()
  const updatedAccounts = [...(settings.accounts || []), account]
  await updateSettings({ accounts: updatedAccounts })
  return updatedAccounts
}

export async function removeAccount(accountId: string) {
  const settings = await getSettings()
  const updatedAccounts = (settings.accounts || []).filter(
    (account) => account.id !== accountId
  )
  await updateSettings({ accounts: updatedAccounts })
  return updatedAccounts
}

export async function updateAccount(updatedAccount: Account) {
  const settings = await getSettings()
  const updatedAccounts = (settings.accounts || []).map((account) =>
    account.id === updatedAccount.id ? updatedAccount : account
  )
  await updateSettings({ accounts: updatedAccounts })
  return updatedAccounts
}
