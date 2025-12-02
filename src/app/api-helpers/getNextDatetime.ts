import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

type Unit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'

// Day of week mapping - simplified to only support full day names
const DAY_NAMES_TO_NUMBERS: { [key: string]: number } = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

/**
 * Returns the next Date(s) after (or equal to) `start` that matches the rule.
 *
 * @param start - JS Date
 * @param amount - number to add (used as the recurrence step when stepping forward)
 * @param unit - one of 'minutes'|'hours'|'days'|'weeks'|'months'|'years'
 * @param timesOfDay - optional array of "HH:mm" or "HH:mm:ss" strings in the target timezone
 * @param tz - IANA timezone string (e.g., 'UTC' or 'America/New_York')
 * @param daysOfWeek - optional array of day names ('Monday', 'Tuesday', etc.)
 * @param daysOfMonth - optional array of 1-31 when unit is 'months'
 * @param count - number of dates to return (default 1)
 */
export function getNextDatetime(
  start: Date,
  amount: number,
  unit: Unit,
  timesOfDay?: string[] | string | null,
  tz: string = 'UTC',
  daysOfWeek?: string[] | string | null,
  daysOfMonth?: number[] | number | null,
  count: number = 1,
): Date[] {
  if (amount <= 0) throw new Error('amount must be > 0')
  if (count <= 0) throw new Error('count must be > 0')

  const startDt = dayjs(start).tz(tz)
  if (!startDt.isValid()) throw new Error('invalid start date')

  // Normalize inputs to arrays
  const timesArray = normalizeToArray(timesOfDay)
  const daysOfWeekArray = normalizeDaysOfWeek(daysOfWeek)
  const daysOfMonthArray = normalizeToArray(daysOfMonth)

  // Helper functions
  const toDate = (d: dayjs.Dayjs) => d.utc().toDate()

  // Generate candidates based on unit and constraints
  const results: Date[] = []
  let currentStart = startDt
  let iterations = 0
  const maxIterations = 10000

  while (results.length < count && iterations < maxIterations) {
    iterations++

    const candidates = generateCandidates(
      currentStart,
      amount,
      unit,
      timesArray,
      daysOfWeekArray,
      daysOfMonthArray,
    )

    // Find the next valid candidate after currentStart
    const validCandidates = candidates
      .filter(
        (candidate) =>
          candidate.isAfter(currentStart) || candidate.isSame(currentStart),
      )
      .sort((a, b) => a.valueOf() - b.valueOf())

    if (validCandidates.length > 0) {
      const nextCandidate = validCandidates[0]
      results.push(toDate(nextCandidate))
      currentStart = nextCandidate.add(1, 'minute') // Move past this candidate for next iteration
    } else {
      // No candidates found, advance by the unit amount
      currentStart = currentStart.add(amount, unit)
    }
  }

  if (results.length === 0) {
    throw new Error('no occurrence found')
  }

  return results.slice(0, count)
}

// Helper function to normalize inputs to arrays
function normalizeToArray<T>(input: T | T[] | null | undefined): T[] {
  if (input === null || input === undefined) return []
  if (Array.isArray(input)) return input
  return [input]
}

// Helper function to normalize day names to numbers
function normalizeDaysOfWeek(
  input: string[] | string | null | undefined,
): number[] {
  if (input === null || input === undefined) return []

  const inputArray = Array.isArray(input) ? input : [input]

  return inputArray.map((day) => {
    if (typeof day === 'string') {
      const dayNum = DAY_NAMES_TO_NUMBERS[day.trim()]
      if (dayNum !== undefined) {
        return dayNum
      }
      throw new Error(
        `Invalid day name: ${day}. Expected: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday`,
      )
    }

    throw new Error(`Invalid day type: ${typeof day}. Expected string.`)
  })
}

// Generate all possible candidates for the current period
function generateCandidates(
  startDt: dayjs.Dayjs,
  amount: number,
  unit: Unit,
  timesArray: string[],
  daysOfWeekArray: number[],
  daysOfMonthArray: number[],
): dayjs.Dayjs[] {
  const candidates: dayjs.Dayjs[] = []

  const parseTime = (d: dayjs.Dayjs, t?: string | null) => {
    if (!t) return d
    const parts = t.split(':').map((p) => parseInt(p, 10))
    const hh = parts[0] ?? 0
    const mm = parts[1] ?? 0
    const ss = parts[2] ?? 0
    return d.hour(hh).minute(mm).second(ss).millisecond(0)
  }

  switch (unit) {
    case 'minutes':
    case 'hours': {
      // Simple time-based recurrence
      const times = timesArray.length > 0 ? timesArray : [null]
      times.forEach((time) => {
        let candidate = startDt.add(amount, unit)
        candidate = parseTime(candidate, time)
        candidates.push(candidate)
      })
      break
    }

    case 'days': {
      // Daily recurrence with optional specific times
      const times = timesArray.length > 0 ? timesArray : [null]
      times.forEach((time) => {
        // Try same day first
        let candidate = parseTime(startDt, time)
        if (candidate.isAfter(startDt) || candidate.isSame(startDt)) {
          candidates.push(candidate)
        }
        // Then try next day
        candidate = parseTime(startDt.add(amount, 'day'), time)
        candidates.push(candidate)
      })
      break
    }

    case 'weeks': {
      // Weekly recurrence with specific days and times
      const days =
        daysOfWeekArray.length > 0 ? daysOfWeekArray : [startDt.day()]
      const times = timesArray.length > 0 ? timesArray : [null]

      days.forEach((targetDay) => {
        times.forEach((time) => {
          // Find next occurrence of this day
          let daysToAdd = (targetDay - startDt.day() + 7) % 7

          if (daysToAdd === 0) {
            // Same day - for weekly recurrence, we want next week
            daysToAdd = 7
          }

          const nextOccurrence = parseTime(startDt.add(daysToAdd, 'day'), time)
          candidates.push(nextOccurrence)
        })
      })
      break
    }

    case 'months': {
      // Monthly recurrence with specific days and times
      const days =
        daysOfMonthArray.length > 0 ? daysOfMonthArray : [startDt.date()]
      const times = timesArray.length > 0 ? timesArray : [null]

      days.forEach((targetDay) => {
        times.forEach((time) => {
          // Try current month
          if (targetDay <= startDt.daysInMonth()) {
            const candidate = parseTime(startDt.date(targetDay), time)
            if (candidate.isAfter(startDt) || candidate.isSame(startDt)) {
              candidates.push(candidate)
            }
          }

          // Try next month
          const nextMonth = startDt.add(amount, 'month')
          if (targetDay <= nextMonth.daysInMonth()) {
            const candidate = parseTime(nextMonth.date(targetDay), time)
            candidates.push(candidate)
          }
        })
      })
      break
    }

    case 'years': {
      // Yearly recurrence
      const times = timesArray.length > 0 ? timesArray : [null]
      times.forEach((time) => {
        const candidate = parseTime(startDt.add(amount, 'year'), time)
        candidates.push(candidate)
      })
      break
    }

    default:
      throw new Error(`Unsupported frequency unit: ${unit}`)
  }

  return candidates
}
