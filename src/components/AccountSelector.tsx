'use client'
import { useSettingsContext } from '@/providers/SettingsProvider'

export default function AccountSelector({
  selectedAccountIds = [],
  onChange,
}: {
  selectedAccountIds?: string[]
  onChange: (accountIds: string[]) => void
}) {
  const { settings } = useSettingsContext()

  const handleToggleAccount = (accountId: string) => {
    if (selectedAccountIds.includes(accountId)) {
      onChange(selectedAccountIds.filter((id) => id !== accountId))
    } else {
      onChange([...selectedAccountIds, accountId])
    }
  }

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
