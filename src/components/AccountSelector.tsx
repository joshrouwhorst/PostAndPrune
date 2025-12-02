'use client'
import { useSettingsContext } from '@/providers/SettingsProvider'
import type { Account } from '@/types/accounts'

export default function AccountSelector({
  multiple = false,
  selectedAccountId = null,
  selectedAccountIds = [],
  onChange,
}: {
  multiple?: boolean
  selectedAccountId?: string | null
  selectedAccountIds?: string[]
  onChange: ({
    account,
    accounts,
  }: {
    account: Account | null
    accounts: Account[] | null
  }) => void
}) {
  const { settings } = useSettingsContext()

  const handleToggleAccount = (accountId: string) => {
    const accounts = settings?.accounts || []
    const account = accounts.find((acc) => acc.id === accountId) || null

    if (!account) {
      return
    }

    const isSelected = selectedAccountIds.includes(accountId)

    if (isSelected) {
      selectedAccountIds = selectedAccountIds.filter((id) => id !== accountId)
      selectedAccountId = null
    } else {
      selectedAccountIds = [...selectedAccountIds, accountId]
      selectedAccountId = accountId
    }

    if (multiple) {
      onChange({
        account: null,
        accounts: accounts.filter((acc) => selectedAccountIds.includes(acc.id)),
      })
    } else {
      if (selectedAccountId === accountId) {
        onChange({ account, accounts: null })
      } else {
        onChange({ account: null, accounts: null })
      }
    }
  }

  const multipleSelectView = () => {
    return (
      <div className="space-y-2">
        {settings?.accounts?.map((account) => (
          <div key={account.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`account-${account.id}`}
              checked={selectedAccountIds.includes(account.id)}
              onChange={() => handleToggleAccount(account.id)}
            />
            <label htmlFor={`account-${account.id}`} className="cursor-pointer">
              {account.name} ({account.platform})
            </label>
          </div>
        ))}
      </div>
    )
  }

  const singleSelectView = () => {
    return (
      <select
        value={selectedAccountId || ''}
        onChange={(e) => handleToggleAccount(e.target.value)}
        className="w-full border rounded p-2"
      >
        <option value="">Select an account</option>
        {settings?.accounts?.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} ({account.platform})
          </option>
        ))}
      </select>
    )
  }

  return multiple ? multipleSelectView() : singleSelectView()
}
