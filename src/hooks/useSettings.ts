import type { Account } from '@/types/accounts'
import type { Settings } from '@/types/types'

interface SettingsHookContext {
  fetchSettings: () => Promise<Settings>
  updateSettings: (newSettings: Partial<Settings>) => Promise<Settings>
  validateAccount: (account: Account) => Promise<boolean>
}

export function useSettings(): SettingsHookContext {
  const fetchSettings = async (): Promise<Settings> => {
    const response = await fetch('/api/settings')
    if (!response.ok) {
      throw new Error('Failed to fetch settings')
    }
    const data: Settings = await response.json()
    return data
  }

  const updateSettings = async (
    newSettings: Partial<Settings>
  ): Promise<Settings> => {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newSettings),
    })
    if (!response.ok) {
      throw new Error('Failed to update settings')
    }
    const data: Settings = await response.json()
    return data
  }

  const validateAccount = async (account: Account): Promise<boolean> => {
    const response = await fetch('/api/accounts/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(account),
    })
    if (!response.ok) {
      return false
    }
    const data = await response.json()
    return data.valid === true
  }

  return {
    fetchSettings,
    updateSettings,
    validateAccount,
  }
}
