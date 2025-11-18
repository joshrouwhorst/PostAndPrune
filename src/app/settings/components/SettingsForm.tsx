'use client'
import TimezoneSelect from '@/components/schedules/TimezoneSelect'
import Toast, { type ToastProps } from '@/components/Toast'
import { Button, Checkbox, Input, Label } from '@/components/ui/forms'
import { useSettingsContext } from '@/providers/SettingsProvider'
import type { Settings } from '@/types/types'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import AccountsForm, {
  type AccountFormData,
  getAccountFromAccountFormData,
} from './AccountsForm'

export default function SettingsForm() {
  const { settings, update, isLoading, error, validateAccount } =
    useSettingsContext()
  const router = useRouter()
  const [formState, setFormState] = useState<Partial<Settings>>({})
  const [originalSettings, setOriginalSettings] = useState<Partial<Settings>>(
    {}
  )
  const [toastMessage, setToastMessage] = useState<ToastProps | null>(null)

  useEffect(() => {
    if (settings) {
      setFormState(settings)
      setOriginalSettings(settings)
    }
  }, [settings])

  // Check if form has unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return JSON.stringify(formState) !== JSON.stringify(originalSettings)
  }, [formState, originalSettings])

  // Warn user about unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()

        // For older browser compatibility (though this is deprecated)
        // Modern browsers will show their own generic message
        return 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target

    setFormState((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    await update(formState)
    setOriginalSettings(formState) // Update original settings after successful save
    setToastMessage({
      message: 'Settings updated successfully',
      type: 'success',
    })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleCancel = () => {
    // Check for unsaved changes
    if (hasUnsavedChanges()) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      )

      if (!confirmDiscard) {
        return // User chose to stay and keep editing
      }
    }

    // Reset form to original state
    if (originalSettings) {
      setFormState(originalSettings)
    }

    // Navigate back if there's history, otherwise go home
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const handleAddAccount = async (
    accountData: AccountFormData,
    accountId?: string
  ) => {
    const existingAccount = accountId
      ? formState.accounts?.find((acc) => acc.id === accountId)
      : null

    const account = getAccountFromAccountFormData(
      accountData,
      existingAccount || undefined
    )

    setToastMessage({
      message: 'Validating account data...',
      type: 'info',
    })

    const isValid = await validateAccount(account)

    if (!isValid) {
      setToastMessage({
        message: 'Invalid account data. Please fill all required fields.',
        type: 'error',
      })
      setTimeout(() => setToastMessage(null), 3000)
      return
    } else {
      setToastMessage({
        message: 'Account data is valid.',
        type: 'success',
      })
      setTimeout(() => setToastMessage(null), 3000)
    }

    if (existingAccount) {
      // Update existing account
      const updatedAccounts = formState.accounts?.map((acc) =>
        acc.id === accountId ? { ...acc, ...account } : acc
      )
      setFormState((prev) => ({
        ...prev,
        accounts: updatedAccounts,
      }))
    } else {
      // Add new account
      const updatedAccounts = [...(formState.accounts || []), account]
      setFormState((prev) => ({
        ...prev,
        accounts: updatedAccounts,
      }))
    }

    //handleSubmit()
  }

  const handleDeleteAccount = (accountId: string) => {
    const updatedAccounts = formState.accounts?.filter(
      (acc) => acc.id !== accountId
    )
    setFormState((prev) => ({
      ...prev,
      accounts: updatedAccounts,
    }))
  }

  if (isLoading && !settings) {
    return <div>Loading settings...</div>
  }

  if (error) {
    return <div>Error loading settings: {error.message}</div>
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-color-gray-200 dark:bg-gray-900 p-6 rounded-lg"
    >
      <div className="flex flex-row gap-4 items-stretch justify-between">
        <div className="w-1/2">
          <h3 className="text-2xl mb-4 font-bold">Accounts</h3>
          <AccountsForm
            accounts={formState.accounts || []}
            onSaveAccount={handleAddAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        </div>
        <div className="w-1/2">
          <div className="grid grid-cols-1 gap-4">
            <SettingsField
              label="Backup Location"
              name="backupLocation"
              value={formState.backupLocation || ''}
              type="text"
              onChange={handleChange}
            />
            <SettingsField
              label="Prune Posts Older Than Months"
              name="pruneAfterMonths"
              value={formState.pruneAfterMonths || 6}
              type="number"
              onChange={handleChange}
            />
            <div className="mb-4">
              <Label>Default Timezone</Label>
              <TimezoneSelect
                value={formState.defaultTimezone || ''}
                onChange={(value) =>
                  setFormState((prev) => ({ ...prev, defaultTimezone: value }))
                }
              />
            </div>
            <div className="mb-4">
              <div className="flex flex-row items-baseline gap-4">
                <div>
                  <Label>Auto Prune</Label>
                  <Checkbox
                    name="autoPruneFrequencyMinutes"
                    id="autoPruneFrequencyMinutes"
                    checked={formState.autoPruneFrequencyMinutes !== undefined}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        autoPruneFrequencyMinutes: e.target.checked
                          ? 1 * 24 * 60 // default to once a day
                          : undefined,
                      }))
                    }
                  />
                </div>
                <div className="flex-1">
                  {formState.autoPruneFrequencyMinutes !== undefined && (
                    <div className="mt-2">
                      <Label htmlFor="autoPruneFrequencyMinutesValue">
                        Frequency (minutes)
                      </Label>
                      <Input
                        type="number"
                        name="autoPruneFrequencyMinutesValue"
                        id="autoPruneFrequencyMinutesValue"
                        value={
                          formState.autoPruneFrequencyMinutes !== undefined
                            ? formState.autoPruneFrequencyMinutes
                            : 60
                        }
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            autoPruneFrequencyMinutes: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex flex-row items-baseline gap-4">
                <div>
                  <Label>Auto Backup</Label>
                  <Checkbox
                    name="autoBackupFrequencyMinutes"
                    id="autoBackupFrequencyMinutes"
                    checked={formState.autoBackupFrequencyMinutes !== undefined}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        autoBackupFrequencyMinutes: e.target.checked
                          ? 1 * 60 // default to once an hour
                          : undefined,
                      }))
                    }
                  />
                </div>
                <div className="flex-1">
                  {formState.autoBackupFrequencyMinutes !== undefined && (
                    <div className="mt-2">
                      <Label htmlFor="autoBackupFrequencyMinutesValue">
                        Frequency (minutes)
                      </Label>
                      <Input
                        type="number"
                        name="autoBackupFrequencyMinutesValue"
                        id="autoBackupFrequencyMinutesValue"
                        value={
                          formState.autoBackupFrequencyMinutes !== undefined
                            ? formState.autoBackupFrequencyMinutes
                            : 60
                        }
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            autoBackupFrequencyMinutes: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="absolute bottom-[50px] left-1/2 transform -translate-x-1/2 px-4 sm:px-6 z-[9999]">
          <Toast {...toastMessage} />
        </div>
      )}

      {/* Unsaved changes indicator */}
      {hasUnsavedChanges() && (
        <div className=" border-yellow-400 text-yellow-700">
          ⚠️ You have unsaved changes
        </div>
      )}

      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isLoading || !hasUnsavedChanges()}
          color="success"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          disabled={isLoading}
          color="danger"
          onClick={handleCancel}
        >
          {hasUnsavedChanges() ? 'Discard Changes' : 'Cancel'}
        </Button>
      </div>
    </form>
  )
}

function SettingsField({
  label,
  name,
  value,
  type,
  onChange,
}: {
  label: string
  name: string
  value: string | number | boolean
  type: 'text' | 'number' | 'checkbox' | 'password'
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="mb-4">
      <Label htmlFor={name}>{label}</Label>
      {type === 'checkbox' ? (
        <Checkbox
          name={name}
          id={name}
          checked={value as boolean}
          onChange={onChange}
        />
      ) : (
        <Input
          type={type}
          name={name}
          id={name}
          value={
            typeof value === 'boolean' ? (value ? 'true' : 'false') : value
          }
          onChange={onChange}
        />
      )}
    </div>
  )
}
