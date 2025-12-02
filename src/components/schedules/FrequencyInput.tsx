/** biome-ignore-all lint/suspicious/noArrayIndexKey: see code */
/** biome-ignore-all lint/style/noNonNullAssertion: see code */
import { useSettingsContext } from '@/providers/SettingsProvider'
import type { ScheduleFrequency } from '@/types/scheduler'
import { useCallback, useEffect, useState } from 'react'
import DaySelector from '../ui/DaySelector'
import { Input, Label, Select } from '../ui/forms'
import TimeSelector from '../ui/TimeSelector'
import TimezoneSelect from './TimezoneSelect'

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const DEFAULT_FREQUENCY: ScheduleFrequency = {
  interval: { every: 1, unit: 'weeks' },
  daysOfWeek: [],
  daysOfMonth: [],
  timesOfDay: [],
  timeZone: 'UTC',
}

export default function FrequencyInput({
  value,
  onChange,
}: {
  value: ScheduleFrequency | undefined
  onChange: (value: ScheduleFrequency) => void
}) {
  // Get default timezone from settings
  const { settings } = useSettingsContext()
  const defaultTimezone = settings?.defaultTimezone || 'UTC'
  DEFAULT_FREQUENCY.timeZone = defaultTimezone

  const [interval, setInterval] = useState({
    every: value?.interval?.every || DEFAULT_FREQUENCY.interval.every,
    unit: value?.interval?.unit || DEFAULT_FREQUENCY.interval.unit,
  })
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(
    value?.daysOfWeek !== undefined
      ? value.daysOfWeek
      : DEFAULT_FREQUENCY.daysOfWeek!,
  )
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>(
    value?.daysOfMonth !== undefined
      ? value.daysOfMonth
      : DEFAULT_FREQUENCY.daysOfMonth!,
  )
  const [timesOfDay, setTimesOfDay] = useState(
    value?.timesOfDay || DEFAULT_FREQUENCY.timesOfDay,
  )
  const [timeZone, setTimeZone] = useState<string | undefined>(value?.timeZone)

  const buildFrequency = useCallback(
    (
      newInterval = interval,
      newDaysOfWeek = daysOfWeek,
      newDaysOfMonth = daysOfMonth,
      newTimesOfDay = timesOfDay,
      newTimeZone = timeZone,
    ): ScheduleFrequency => {
      const frequency: ScheduleFrequency = {
        interval: newInterval,
        timesOfDay: newTimesOfDay,
        timeZone: newTimeZone,
      }

      // Only include dayOfWeek for weekly schedules
      if (newInterval.unit === 'weeks') {
        frequency.daysOfWeek = newDaysOfWeek
      }

      // Only include dayOfMonth for monthly schedules
      if (newInterval.unit === 'months') {
        frequency.daysOfMonth = newDaysOfMonth
      }

      return frequency
    },
    [interval, daysOfWeek, daysOfMonth, timesOfDay, timeZone],
  )

  // Effect to notify parent of default values on mount ONLY
  useEffect(() => {
    if (!value) {
      onChange(DEFAULT_FREQUENCY)
    }
  }, [onChange, value])

  // Effect to sync internal state when value prop changes from parent
  useEffect(() => {
    if (value) {
      setInterval({
        every: value.interval?.every || DEFAULT_FREQUENCY.interval.every,
        unit: value.interval?.unit || DEFAULT_FREQUENCY.interval.unit,
      })
      setDaysOfWeek(
        value.daysOfWeek !== undefined
          ? value.daysOfWeek
          : DEFAULT_FREQUENCY.daysOfWeek!,
      )
      setDaysOfMonth(
        value.daysOfMonth !== undefined
          ? value.daysOfMonth
          : DEFAULT_FREQUENCY.daysOfMonth!,
      )
      setTimesOfDay(value.timesOfDay || DEFAULT_FREQUENCY.timesOfDay)
      setTimeZone(value.timeZone || DEFAULT_FREQUENCY.timeZone)
    }
  }, [value])

  const handleIntervalChange = (
    field: 'every' | 'unit',
    newValue: string | number,
  ) => {
    const newInterval = { ...interval, [field]: newValue }
    setInterval(newInterval)

    const frequency = buildFrequency(
      newInterval,
      daysOfWeek,
      daysOfMonth,
      timesOfDay,
      timeZone,
    )
    onChange(frequency)
  }

  const handleDayChange = (
    type: 'week' | 'month',
    values: string[] | number[],
  ) => {
    if (type === 'week') {
      setDaysOfWeek(values as string[])
      const frequency = buildFrequency(
        interval,
        values as string[],
        daysOfMonth,
        timesOfDay,
        timeZone,
      )
      onChange(frequency)
    } else {
      setDaysOfMonth(values as number[])
      const frequency = buildFrequency(
        interval,
        daysOfWeek,
        values as number[],
        timesOfDay,
        timeZone,
      )
      onChange(frequency)
    }
  }

  const handleTimeChange = (newTimes: string[]) => {
    setTimesOfDay(newTimes)
    const frequency = buildFrequency(
      interval,
      daysOfWeek,
      daysOfMonth,
      newTimes,
      timeZone,
    )
    onChange(frequency)
  }

  const handleTimezoneChange = (newTimezone: string) => {
    setTimeZone(newTimezone)
    const frequency = buildFrequency(
      interval,
      daysOfWeek,
      daysOfMonth,
      timesOfDay,
      newTimezone,
    )
    onChange(frequency)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end space-x-2">
        <div>
          <Label className="text-sm text-gray-700">Every</Label>
          <Input
            type="number"
            min="1"
            value={interval.every}
            onChange={(e) =>
              handleIntervalChange('every', parseInt(e.target.value, 10) || 1)
            }
          />
        </div>

        <Select
          value={interval.unit}
          onChange={(e) => handleIntervalChange('unit', e.target.value)}
        >
          {/* Just use this option for debugging */}
          <Select.Option value="minutes">Minutes</Select.Option>
          <Select.Option value="hours">Hours</Select.Option>
          <Select.Option value="days">Days</Select.Option>
          <Select.Option value="weeks">Weeks</Select.Option>
          <Select.Option value="months">Months</Select.Option>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        {interval.unit === 'weeks' && (
          <div>
            <Label>Days of the Week</Label>
            <div className="grid grid-cols-4 gap-2 mt-2 w-full">
              {WEEKDAYS.map((day) => (
                <label
                  key={day}
                  className="flex items-center space-x-1 text-md"
                >
                  <input
                    type="checkbox"
                    checked={daysOfWeek.includes(day)}
                    onChange={(e) => {
                      const checked = e.target.checked
                      let updated: string[]
                      if (checked) {
                        updated = [...daysOfWeek, day]
                      } else {
                        updated = daysOfWeek.filter((d) => d !== day)
                      }
                      handleDayChange('week', updated)
                    }}
                    className="form-checkbox accent-blue-600"
                  />
                  <span>{day}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {interval.unit === 'months' && (
          <div>
            <Label>Days of the Month</Label>
            <DaySelector
              selected={daysOfMonth}
              onChange={(days) => handleDayChange('month', days)}
              maxSelectable={31}
            />
          </div>
        )}
      </div>

      {interval.unit === 'days' ||
      interval.unit === 'weeks' ||
      interval.unit === 'months' ? (
        <div className="flex flex-col gap-4">
          <div>
            <Label>Times of Day</Label>
            <TimeSelector
              value={timesOfDay}
              onChange={handleTimeChange}
              className="w-full text-sm"
            />
          </div>
          <div>
            <Label>Time Zone</Label>
            <TimezoneSelect
              value={timeZone}
              onChange={(v) => handleTimezoneChange(v)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
