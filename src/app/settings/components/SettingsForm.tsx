'use client'
import TimezoneSelect from '@/components/schedules/TimezoneSelect'
import Toast, { type ToastProps } from '@/components/Toast'
import { Button, Checkbox, Input, Label } from '@/components/ui/forms'
import { useSettingsContext } from '@/providers/SettingsProvider'
import type { Settings } from '@/types/types'
import type React from 'react'
import { useEffect, useState } from 'react'
import AccountsForm, {
  type AccountFormData,
  getAccountFromAccountFormData,
} from './AccountsForm'

export default function SettingsForm() {
  const { settings, update, isLoading, error, validateAccount } =
    useSettingsContext()
  const [formState, setFormState] = useState<Partial<Settings>>({})
  const [toastMessage, setToastMessage] = useState<ToastProps | null>(null)

  useEffect(() => {
    if (settings) {
      setFormState(settings)
    }
  }, [settings])

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
    setToastMessage({
      message: 'Settings updated successfully',
      type: 'success',
    })
    setTimeout(() => setToastMessage(null), 3000)
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
        <div className="w-1/2 rounded p-4 border">
          <div className="">
            <AccountsForm
              accounts={formState.accounts || []}
              onSaveAccount={handleAddAccount}
              onDeleteAccount={handleDeleteAccount}
            />
          </div>
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

      {toastMessage && <Toast {...toastMessage} />}
      <Button type="submit" disabled={isLoading}>
        Save
      </Button>
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
