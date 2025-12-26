import { Button, Checkbox, Input, Label, Select } from '@/components/ui/forms'
import type { Account, SocialPlatform } from '@/types/accounts'
import { PencilIcon, PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'

// OAuth Section Component for Threads
interface ThreadsOAuthSectionProps {
  accountData: AccountFormData
  onUpdate: (credentials: Partial<AccountFormData['credentials']>) => void
  isEditing: boolean
}

function ThreadsOAuthSection({
  accountData,
  onUpdate,
  isEditing,
}: ThreadsOAuthSectionProps) {
  const [oauthStatus, setOauthStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >(() => {
    return accountData.credentials.accessToken ? 'connected' : 'disconnected'
  })
  const [errorMessage, setErrorMessage] = useState<string>('')

  const handleConnectOAuth = async () => {
    try {
      setOauthStatus('connecting')
      setErrorMessage('')

      // Generate state parameter for OAuth security
      const state = crypto.randomUUID()

      // Redirect to OAuth authorization endpoint
      const response = await fetch('/api/auth/threads/authorize', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.hint || errorData.error || 'Failed to initiate OAuth flow',
        )
      }

      const data = await response.json()
      const { authUrl } = data

      if (!authUrl) {
        throw new Error('No authorization URL received from server')
      }

      // Open OAuth popup window
      const popup = window.open(
        authUrl,
        'threads-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes',
      )

      // Listen for OAuth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'THREADS_OAUTH_SUCCESS') {
          const { accessToken, refreshToken, expiresAt } = event.data
          onUpdate({
            accessToken,
            refreshToken,
            tokenExpiresAt: expiresAt,
          })
          setOauthStatus('connected')
          popup?.close()
          window.removeEventListener('message', handleMessage)
        } else if (event.data.type === 'THREADS_OAUTH_ERROR') {
          setErrorMessage(event.data.error || 'OAuth authentication failed')
          setOauthStatus('error')
          popup?.close()
          window.removeEventListener('message', handleMessage)
        }
      }

      window.addEventListener('message', handleMessage)

      // Handle popup closing without completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          if (oauthStatus === 'connecting') {
            setOauthStatus('disconnected')
          }
        }
      }, 1000)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Connection failed',
      )
      setOauthStatus('error')
    }
  }

  const handleDisconnectOAuth = async () => {
    try {
      if (accountData.credentials.accessToken) {
        // Revoke the token
        await fetch('/api/auth/threads/revoke', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accountData.credentials.accessToken}`,
          },
        })
      }

      onUpdate({
        accessToken: '',
        refreshToken: '',
        tokenExpiresAt: '',
      })
      setOauthStatus('disconnected')
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Disconnection failed',
      )
    }
  }

  const getTokenExpiryText = () => {
    if (!accountData.credentials.tokenExpiresAt) return ''

    const expiryDate = new Date(accountData.credentials.tokenExpiresAt)
    const now = new Date()
    const isExpired = expiryDate <= now

    if (isExpired) {
      return 'Token expired - Please reconnect'
    } else {
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )

      if (daysUntilExpiry <= 7) {
        return `⚠ Token expires in ${daysUntilExpiry} days`
      } else {
        return `Token expires in ${daysUntilExpiry} days`
      }
    }
  }

  const isTokenExpiring = () => {
    if (!accountData.credentials.tokenExpiresAt) return false

    const expiryDate = new Date(accountData.credentials.tokenExpiresAt)
    const now = new Date()
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )

    return daysUntilExpiry <= 7 && daysUntilExpiry > 0
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="text-lg font-medium">Threads Authentication</h3>

      {oauthStatus === 'disconnected' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Connect your Threads account using OAuth to enable posting and
            backup features.
          </p>
          <Button
            type="button"
            onClick={handleConnectOAuth}
            color="primary"
            variant="outline"
          >
            Connect Threads Account
          </Button>
        </div>
      )}

      {oauthStatus === 'connecting' && (
        <div className="space-y-3">
          <p className="text-sm text-blue-600">
            Connecting to Threads... Please complete the authorization in the
            popup window.
          </p>
        </div>
      )}

      {oauthStatus === 'connected' && (
        <div className="space-y-3">
          <div
            className={`flex items-center justify-between p-3 rounded-md border-2 ${
              isTokenExpiring()
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}
          >
            <div>
              <p
                className={`text-sm font-medium ${
                  isTokenExpiring() ? 'text-yellow-800' : 'text-green-800'
                }`}
              >
                {isTokenExpiring()
                  ? '⚠ Connected to Threads'
                  : '✓ Connected to Threads'}
              </p>
              <p
                className={`text-xs ${
                  isTokenExpiring() ? 'text-yellow-600' : 'text-green-600'
                }`}
              >
                {getTokenExpiryText()}
              </p>
            </div>
            <div className="flex gap-2">
              {isTokenExpiring() && (
                <Button
                  type="button"
                  onClick={handleConnectOAuth}
                  color="primary"
                  variant="outline"
                  size="md"
                >
                  Refresh Token
                </Button>
              )}
              <Button
                type="button"
                onClick={handleDisconnectOAuth}
                color="danger"
                variant="outline"
                size="md"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      )}

      {oauthStatus === 'error' && (
        <div className="space-y-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 font-medium">Connection Error</p>
            <p className="text-xs text-red-600">{errorMessage}</p>
          </div>
          <Button
            type="button"
            onClick={handleConnectOAuth}
            color="primary"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}

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
      {accounts.length > 0 && (
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-4"
            >
              <div>
                <p className="font-semibold">{account.name}</p>
                <p className="text-sm text-gray-500">{account.platform}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => showEditAccountForm(account.id)}
                  variant="icon"
                >
                  <PencilIcon />
                </Button>
                <Button
                  onClick={() => onDeleteAccount(account.id)}
                  color="danger"
                  variant="icon"
                >
                  <XIcon />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button onClick={showAddAccountForm} color="primary" variant="outline">
        <PlusIcon /> Add Account
      </Button>
    </div>
  )
}

// Form data interface
export interface AccountFormData {
  name: string
  platform: SocialPlatform
  isActive: boolean
  credentials: {
    // Bluesky credentials
    identifier?: string
    password?: string
    displayName?: string
    // Threads OAuth credentials (populated after OAuth flow)
    accessToken?: string
    refreshToken?: string
    tokenExpiresAt?: string
  }
}

export function getAccountFromAccountFormData(
  data: AccountFormData,
  existingAccount?: Account,
): Account {
  const account: Account = {
    id: existingAccount ? existingAccount.id : `new-${crypto.randomUUID()}`, // Temporary ID for new accounts, will be replaced when saved
    name: data.name,
    platform: data.platform,
    isActive: data.isActive,
    createdAt: existingAccount
      ? existingAccount.createdAt
      : new Date().toISOString(),
    profile: existingAccount?.profile || null,
  }

  // Handle platform-specific credentials
  if (data.platform === 'bluesky') {
    account.credentials = {
      identifier: data.credentials.identifier || '',
      password: data.credentials.password || '',
      displayName: data.credentials.displayName || '',
    }
  } else if (data.platform === 'threads') {
    account.credentials = {
      accessToken: data.credentials.accessToken || '',
      refreshToken: data.credentials.refreshToken || '',
      tokenExpiresAt: data.credentials.tokenExpiresAt || '',
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
    credentials: {
      // Bluesky credentials
      identifier: account?.credentials?.identifier || '',
      password: account?.credentials?.password || '',
      displayName: account?.credentials?.displayName || '',
      // Threads OAuth credentials
      accessToken: account?.credentials?.accessToken || '',
      refreshToken: account?.credentials?.refreshToken || '',
      tokenExpiresAt: account?.credentials?.tokenExpiresAt || '',
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const updateField = (
    field: keyof AccountFormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateCredentials = (
    field: keyof AccountFormData['credentials'],
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [field]: value,
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
              <Select.Option value="threads">Threads</Select.Option>
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
                value={formData.credentials?.identifier || ''}
                onChange={(e) =>
                  updateCredentials('identifier', e.target.value)
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
                value={formData.credentials?.password || ''}
                onChange={(e) => updateCredentials('password', e.target.value)}
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
                value={formData.credentials?.displayName || ''}
                onChange={(e) =>
                  updateCredentials('displayName', e.target.value)
                }
                placeholder="How this account appears in the app"
              />
            </div>
          </div>
        )}

        {/* Threads OAuth credentials */}
        {formData.platform === 'threads' && (
          <ThreadsOAuthSection
            accountData={formData}
            onUpdate={(credentials) =>
              setFormData((prev) => ({
                ...prev,
                credentials: { ...prev.credentials, ...credentials },
              }))
            }
            isEditing={isEditing}
          />
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
