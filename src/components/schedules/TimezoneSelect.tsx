'use client'
import { useEffect, useState } from 'react'
import { Select } from '../ui/forms'

interface TimezoneSelectProps {
  value?: string
  onChange?: (timezone: string) => void
}

const TimezoneSelect: React.FC<TimezoneSelectProps> = ({
  value = 'UTC',
  onChange,
}) => {
  const [hasInitialized, setHasInitialized] = useState(false)

  // A curated list of common timezones
  // In a real app, consider using a library or API for a comprehensive list
  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Stockholm',
    'Europe/Moscow',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Asia/Seoul',
    'Asia/Singapore',
    'Asia/Bangkok',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Perth',
    'Pacific/Auckland',
    'America/Toronto',
    'America/Vancouver',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'America/Buenos_Aires',
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Africa/Lagos',
  ]

  const getTimezoneOffset = (timezone: string): string => {
    try {
      const now = new Date()
      const tzDate = new Date(
        now.toLocaleString('en-US', { timeZone: timezone }),
      )
      const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
      const tzOffset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
      const sign = tzOffset >= 0 ? '+' : ''
      return `(GMT${sign}${tzOffset})`
    } catch {
      return ''
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(event.target.value)
  }

  useEffect(() => {
    if (value && !hasInitialized) {
      onChange?.(value)
      setHasInitialized(true)
    }
  }, [value, onChange, hasInitialized])

  return (
    <Select value={value} onChange={handleChange}>
      {timezones.map((timezone) => (
        <Select.Option key={timezone} value={timezone}>
          {timezone.replace('_', ' ')} {getTimezoneOffset(timezone)}
        </Select.Option>
      ))}
    </Select>
  )
}

export default TimezoneSelect
