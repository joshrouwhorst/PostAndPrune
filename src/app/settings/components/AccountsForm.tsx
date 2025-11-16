import { Button, Checkbox, Input, Label, Select } from '@/components/ui/forms'
import type { Account, SocialPlatform } from '@/types/accounts'
import { useState } from 'react'

interface AccountsFormProps {
  accounts: Account[]
  onDeleteAccount: (accountId: string) => void
  onSaveAccount: (accountData: AccountFormData, accountId?: string) => void
}

export default function AccountsForm({
  accounts,
  onDeleteAccount,
  onSaveAccount,
}: AccountsFormProps) {
  const [state, setState] = useState({
    mode: 'list',
    accountId: null as string | null,
  })

  const showAddAccountForm = () => {
    setState({ mode: 'add', accountId: null })
  }

  const showEditAccountForm = (accountId: string) => {
    setState({ mode: 'edit', accountId })
  }

  if (state.mode === 'add') {
    return (
      <AddEditAccountForm
        onCancel={() => setState({ mode: 'list', accountId: null })}
        onSave={(accountData) => {
          onSaveAccount(accountData)
          setState({ mode: 'list', accountId: null })
        }}
      />
    )
  }

  if (state.mode === 'edit') {
    const account = accounts.find((acc) => acc.id === state.accountId)
    if (!account) {
      setState({ mode: 'list', accountId: null })
      return null
    }

    return (
      <AddEditAccountForm
        account={account}
        onCancel={() => setState({ mode: 'list', accountId: null })}
        onSave={(accountData) => {
          onSaveAccount(accountData, account.id)
          setState({ mode: 'list', accountId: null })
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {accounts.length === 0 && (
        <p className="text-lg text-gray-500">No accounts added yet.</p>
      )}
      {accounts.map((account) => (
        <div
          key={account.id}
          className="flex items-center justify-between p-4 border rounded-md"
        >
          <div>
            <p className="font-semibold">{account.name}</p>
            <p className="text-sm text-gray-500">{account.platform}</p>
          </div>
          <div className="space-x-2">
            <Button onClick={() => showEditAccountForm(account.id)}>
              Edit
            </Button>
            <Button onClick={() => onDeleteAccount(account.id)}>Delete</Button>
          </div>
        </div>
      ))}
      <Button onClick={showAddAccountForm}>Add Account</Button>
    </div>
  )
}

// Form data interface
export interface AccountFormData {
  name: string
  platform: SocialPlatform
  isActive: boolean
  isDefault: boolean
  credentials: {
    bluesky: {
      identifier: string
      password: string
      displayName: string
    }
  }
}

export function getAccountFromAccountFormData(
  data: AccountFormData,
  existingAccount?: Account
): Account {
  const account: Account = {
    id: existingAccount ? existingAccount.id : 'new',
    name: data.name,
    platform: data.platform,
    isActive: data.isActive,
    isDefault: data.isDefault,
    credentials: {},
    createdAt: existingAccount
      ? existingAccount.createdAt
      : new Date().toISOString(),
  }

  // Add platform-specific credentials
  if (data.platform === 'bluesky') {
    account.credentials.bluesky = {
      identifier: data.credentials.bluesky.identifier,
      password: data.credentials.bluesky.password,
      displayName: data.credentials.bluesky.displayName,
    }
  }

  return account
}

// Add/Edit Account Form Component
interface AddEditAccountFormProps {
  account?: Account
  onCancel: () => void
  onSave: (accountData: AccountFormData) => void
}

function AddEditAccountForm({
  account,
  onCancel,
  onSave,
}: AddEditAccountFormProps) {
  const isEditing = !!account

  const [formData, setFormData] = useState<AccountFormData>({
    name: account?.name || '',
    platform: account?.platform || 'bluesky',
    isActive: account?.isActive ?? true,
    isDefault: account?.isDefault ?? false,
    credentials: {
      bluesky: {
        identifier: account?.credentials.bluesky?.identifier || '',
        password: account?.credentials.bluesky?.password || '',
        displayName: account?.credentials.bluesky?.displayName || '',
      },
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const updateField = (
    field: keyof AccountFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateCredentials = (
    platform: 'bluesky',
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [platform]: {
          ...prev.credentials[platform],
          [field]: value,
        },
      },
    }))
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-6">
        {isEditing ? 'Edit Account' : 'Add Account'}
      </h2>

      <div className="space-y-6">
        {/* Basic Account Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., Personal, Business, etc."
              required
            />
          </div>

          <div>
            <Label htmlFor="platform">Platform</Label>
            <Select
              id="platform"
              value={formData.platform}
              onChange={(e) =>
                updateField('platform', e.target.value as SocialPlatform)
              }
              required
            >
              <Select.Option value="bluesky">Bluesky</Select.Option>
            </Select>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
              />
              <Label htmlFor="isActive" className="ml-2 text-sm mb-0">
                Active
              </Label>
            </div>

            <div className="flex items-center">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => updateField('isDefault', e.target.checked)}
              />
              <Label htmlFor="isDefault" className="ml-2 text-sm mb-0">
                Default account
              </Label>
            </div>
          </div>
        </div>

        {/* Platform-specific credentials */}
        {formData.platform === 'bluesky' && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-medium">Bluesky Credentials</h3>

            <div>
              <Label htmlFor="bluesky-identifier">Username/Email</Label>
              <Input
                id="bluesky-identifier"
                type="text"
                value={formData.credentials.bluesky?.identifier || ''}
                onChange={(e) =>
                  updateCredentials('bluesky', 'identifier', e.target.value)
                }
                placeholder="username.bsky.social or email@example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="bluesky-password">Password</Label>
              <Input
                id="bluesky-password"
                type="password"
                value={formData.credentials.bluesky?.password || ''}
                onChange={(e) =>
                  updateCredentials('bluesky', 'password', e.target.value)
                }
                placeholder="Your Bluesky password"
                required
              />
            </div>

            <div>
              <Label htmlFor="bluesky-displayName">
                Display Name (Optional)
              </Label>
              <Input
                id="bluesky-displayName"
                type="text"
                value={formData.credentials.bluesky?.displayName || ''}
                onChange={(e) =>
                  updateCredentials('bluesky', 'displayName', e.target.value)
                }
                placeholder="How this account appears in the app"
              />
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            {isEditing ? 'Update Account' : 'Add Account'}
          </Button>
        </div>
      </div>
    </div>
  )
}
