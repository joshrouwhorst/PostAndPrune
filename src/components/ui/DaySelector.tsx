import { useState, useRef, useEffect } from 'react'
import { Button } from './forms'

type DaySelectorProps = {
  selected?: number[] // initial selected days (1-31)
  onChange?: (days: number[]) => void // called with sorted unique array
  maxSelectable?: number // optional limit
  className?: string
}

export default function DaySelector({
  selected = [],
  onChange,
  maxSelectable,
  className,
}: DaySelectorProps) {
  const [selectedSet, setSelectedSet] = useState<Set<number>>(
    () => new Set(selected.filter((d) => d >= 1 && d <= 31)),
  )
  const lastAnchor = useRef<number | null>(null)
  const isDragging = useRef(false)
  const dragMode = useRef<'add' | 'remove' | null>(null)
  const onChangeRef = useRef(onChange)
  const lastEmittedValue = useRef<string>('')

  // Keep the onChange callback reference up to date
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // keep external prop in sync if it changes
  useEffect(() => {
    const filteredSelected = selected
      .filter((d) => d >= 1 && d <= 31)
      .sort((a, b) => a - b)
    setSelectedSet((currentSet) => {
      const currentArray = Array.from(currentSet).sort((a, b) => a - b)

      // Only update if the arrays are actually different
      if (
        filteredSelected.length !== currentArray.length ||
        !filteredSelected.every((day, index) => day === currentArray[index])
      ) {
        return new Set(filteredSelected)
      }
      return currentSet
    })
  }, [selected])

  useEffect(() => {
    const sortedArray = Array.from(selectedSet).sort((a, b) => a - b)
    const arrayString = sortedArray.join(',')

    // Only call onChange if the value has actually changed
    if (arrayString !== lastEmittedValue.current) {
      lastEmittedValue.current = arrayString
      onChangeRef.current?.(sortedArray)
    }
  }, [selectedSet])

  const toggleDay = (day: number) => {
    setSelectedSet((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else {
        if (maxSelectable && next.size >= maxSelectable) return prev
        next.add(day)
      }
      lastAnchor.current = day
      return next
    })
  }

  const setRange = (from: number, to: number, add: boolean) => {
    const start = Math.min(from, to)
    const end = Math.max(from, to)
    setSelectedSet((prev) => {
      const next = new Set(prev)
      for (let d = start; d <= end; d++) {
        if (add) {
          if (maxSelectable && next.size >= maxSelectable) break
          next.add(d)
        } else {
          next.delete(d)
        }
      }
      return next
    })
  }

  const handleMouseDown = (e: React.MouseEvent, day: number) => {
    const isSelected = selectedSet.has(day)
    isDragging.current = true
    dragMode.current = isSelected ? 'remove' : 'add'
    // left click primary only
    if ((e.nativeEvent as MouseEvent).button !== 0) return
    // support shift for range from lastAnchor
    if (e.shiftKey && lastAnchor.current != null) {
      setRange(lastAnchor.current, day, dragMode.current === 'add')
    } else {
      // toggle single
      toggleDay(day)
    }
  }

  const handleMouseEnter = (day: number) => {
    if (!isDragging.current || dragMode.current == null) return
    // while dragging, set range between anchor and current
    if (lastAnchor.current == null) lastAnchor.current = day
    setRange(lastAnchor.current, day, dragMode.current === 'add')
  }

  useEffect(() => {
    const up = () => {
      isDragging.current = false
      dragMode.current = null
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  // keyboard handlers for accessibility: focusable buttons
  const handleKey = (e: React.KeyboardEvent, day: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey && lastAnchor.current != null) {
        // range from anchor
        setRange(lastAnchor.current, day, true)
      } else {
        toggleDay(day)
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      // ctrl/cmd + A selects all
      e.preventDefault()
      const all = new Set<number>()
      for (let d = 1; d <= 31; d++) {
        if (maxSelectable && all.size >= maxSelectable) break
        all.add(d)
      }
      setSelectedSet(all)
    }
  }

  const clearAll = () => setSelectedSet(new Set())
  const selectAll = () => {
    const all = new Set<number>()
    for (let d = 1; d <= 31; d++) {
      if (maxSelectable && all.size >= maxSelectable) break
      all.add(d)
    }
    setSelectedSet(all)
  }

  // helper for ARIA label
  const ariaLabel = (day: number) =>
    `Day ${day}${selectedSet.has(day) ? ', selected' : ''}`

  return (
    <div className={className}>
      <div className="flex gap-2 items-center mb-2">
        <Button type="button" onClick={selectAll}>
          Select all
        </Button>
        <Button type="button" onClick={clearAll}>
          Clear
        </Button>
        <div className="ml-auto text-sm text-gray-600">
          <span className="font-medium">{selectedSet.size}</span> selected
        </div>
      </div>

      <div
        className="grid grid-cols-7 gap-2 select-none"
        role="listbox"
        aria-label={`Day selector 1 to ${maxSelectable ?? 31}`}
      >
        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
          const isSelected = selectedSet.has(day)
          return (
            <button
              key={day}
              type="button"
              aria-pressed={isSelected}
              aria-label={ariaLabel(day)}
              onMouseDown={(e) => handleMouseDown(e, day)}
              onMouseEnter={() => handleMouseEnter(day)}
              onKeyDown={(e) => handleKey(e, day)}
              onTouchStart={() => {
                // simple mobile: toggle on touchstart
                toggleDay(day)
              }}
              className={`h-10 flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500
                ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-transparent text-gray-800 dark:text-white border border-gray-200'
                }
                `}
            >
              <span className="text-sm font-medium">{day}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 text-sm text-gray-600">
        You can click to toggle, shift+click to select range, drag to
        add/remove.
      </div>
    </div>
  )
}
