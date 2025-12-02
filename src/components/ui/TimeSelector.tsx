import { useEffect, useState, useRef } from 'react'
import { Button, Label, Select } from './forms'
import { Plus, X } from 'lucide-react'

type TimeSelectorProps = {
  value?: string[] // array of "HH:mm"
  onChange?: (times: string[]) => void
  className?: string
  presets?: string[] // optional presets in "HH:mm", e.g., ["07:30","13:45"]
  maxItems?: number
}

function to24(hour: number, minute: number, am: boolean) {
  let h = hour % 12
  if (!am) h += 12
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function toLabel(h24m: string) {
  const [hh, mm] = h24m.split(':').map(Number)
  const am = hh < 12
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  const suffix = am ? 'am' : 'pm'
  return `${h12}:${String(mm).padStart(2, '0')}${suffix}`
}

export default function TimeSelector({
  value = [],
  onChange,
  className = '',
  presets = ['07:30', '09:00', '12:00', '15:30', '17:00', '19:00'],
  maxItems,
}: TimeSelectorProps) {
  const [times, setTimes] = useState<string[]>(() =>
    Array.from(new Set(value.filter((t) => /^\d{2}:\d{2}$/.test(t)))),
  )
  const [hour, setHour] = useState<number>(7)
  const [minute, setMinute] = useState<number>(30)
  const [isAM, setIsAM] = useState<boolean>(true)

  // Use ref to store the latest onChange callback to avoid infinite loops
  const onChangeRef = useRef(onChange)

  // Update ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    // keep internal in sync if prop changes
    const normalizedValue = Array.from(
      new Set(value.filter((t) => /^\d{2}:\d{2}$/.test(t))),
    )
    setTimes((prev) => {
      // Only update if the values are actually different to prevent unnecessary re-renders
      if (
        prev.length !== normalizedValue.length ||
        !prev.every((t) => normalizedValue.includes(t))
      ) {
        return normalizedValue
      }
      return prev
    })
  }, [value])

  useEffect(() => {
    // Call the latest onChange callback when times change
    const sortedTimes = times.slice().sort()
    onChangeRef.current?.(sortedTimes)
  }, [times])

  const addTime = (t24: string) => {
    if (!/^\d{2}:\d{2}$/.test(t24)) return
    setTimes((prev) => {
      if (prev.includes(t24)) return prev
      if (maxItems && prev.length >= maxItems) return prev
      return [...prev, t24].sort()
    })
  }

  const removeTime = (t24: string) =>
    setTimes((prev) => prev.filter((t) => t !== t24))

  const handleAddFromPicker = () => {
    const t = to24(hour, minute, isAM)
    addTime(t)
  }

  return (
    <div className={className}>
      <div className="flex flex-row justify-between">
        <div className="flex-1 flex flex-row items-center gap-2">
          <Label className="sr-only">Hour</Label>
          <Select
            aria-label="Hour"
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="px-2 py-1 border rounded"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
              <Select.Option key={h} value={h}>
                {h}
              </Select.Option>
            ))}
          </Select>

          <Label className="sr-only">Minute</Label>
          <Select
            aria-label="Minute"
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="px-2 py-1 border rounded"
          >
            {Array.from({ length: 60 / 5 }, (_, i) => i * 5).map((m) => (
              <Select.Option key={m} value={m}>
                {String(m).padStart(2, '0')}
              </Select.Option>
            ))}
          </Select>

          <div className="flex items-center">
            <Button
              type="button"
              onClick={() => setIsAM(false)}
              className={`px-2 py-1 ${isAM ? 'visible' : 'hidden'}`}
            >
              AM
            </Button>
            <Button
              type="button"
              onClick={() => setIsAM(true)}
              className={`px-2 py-1 ${!isAM ? 'visible' : 'hidden'}`}
            >
              PM
            </Button>
          </div>
        </div>

        <div className="flex flex-row gap-4">
          <button
            type="button"
            onClick={handleAddFromPicker}
            className="ml-2 px-3 py-1 hover:bg-indigo-600 hover:text-white rounded dark:hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setTimes([])
            }}
            className="px-2 py-1 bg-gray-100 dark:bg-gray-800 dark:text-gray-100 rounded"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="my-3">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => addTime(p)}
              className="px-2 py-1 bg-gray-50 border rounded text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              {toLabel(p)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap gap-2">
          {times.length === 0 && (
            <div className="text-sm text-gray-500">No times selected.</div>
          )}
          {times.map((t) => (
            <div
              key={t}
              className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-sm dark:bg-indigo-900 dark:border-indigo-700"
            >
              <span className="dark:text-indigo-100">{toLabel(t)}</span>
              <button
                type="button"
                onClick={() => removeTime(t)}
                aria-label={`Remove ${t}`}
                className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
