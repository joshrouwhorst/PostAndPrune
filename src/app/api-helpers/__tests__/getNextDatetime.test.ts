/** biome-ignore-all lint/suspicious/noExplicitAny: needed for test */
import { getNextDatetime } from '@/app/api-helpers/getNextDatetime'

describe('getNextDatetime', () => {
  it('should add minutes correctly', () => {
    const start = new Date('2025-09-23T10:00:00Z')
    const results = getNextDatetime(start, 15, 'minutes')
    expect(results[0].toISOString()).toBe('2025-09-23T10:15:00.000Z')
  })

  it('should add hours correctly', () => {
    const start = new Date('2025-09-23T10:00:00Z')
    const results = getNextDatetime(start, 2, 'hours')
    expect(results[0].toISOString()).toBe('2025-09-23T12:00:00.000Z')
  })

  it('should set timeOfDay with UTC', () => {
    const start = new Date('2025-09-23T10:00:00Z')
    const results = getNextDatetime(start, 1, 'weeks', ['08:30'], 'UTC')
    expect(results[0].toISOString()).toBe('2025-09-30T08:30:00.000Z')
  })

  it('should set timeOfDay with America/New_York', () => {
    const start = new Date('2025-09-23T08:30:00Z')
    const results = getNextDatetime(
      start,
      1,
      'weeks',
      ['08:30'],
      'America/New_York',
    )
    expect(results[0].toISOString()).toBe('2025-09-30T12:30:00.000Z')
  })

  it('should go to the next time within the day if it has not yet passed', () => {
    const start = new Date('2025-09-23T07:00:00Z')
    const results = getNextDatetime(start, 1, 'days', ['08:30'], 'UTC')
    expect(results[0].toISOString()).toBe('2025-09-23T08:30:00.000Z')
  })

  it('should go to the next day if the time has passed', () => {
    const start = new Date('2025-09-23T10:00:00Z')
    const results = getNextDatetime(start, 1, 'days', ['08:30'], 'UTC')
    expect(results[0].toISOString()).toBe('2025-09-24T08:30:00.000Z')
  })

  it('should go to the next day and time within the week if it has not yet passed', () => {
    const start = new Date('2025-09-23T07:00:00Z')
    const results = getNextDatetime(start, 1, 'weeks', ['08:30'], 'UTC', [
      'Friday',
    ])
    expect(results[0].toISOString()).toBe('2025-09-26T08:30:00.000Z')
  })

  it('should go to the next week if the day and time has passed', () => {
    const start = new Date('2025-09-23T07:00:00Z')
    const results = getNextDatetime(start, 1, 'weeks', ['08:30'], 'UTC', [
      'Monday',
    ])
    expect(results[0].toISOString()).toBe('2025-09-29T08:30:00.000Z')
  })

  it('should go to the next day and time within the month if it has not yet passed', () => {
    const start = new Date('2025-09-23T07:00:00Z')
    const results = getNextDatetime(
      start,
      1,
      'months',
      ['08:30'],
      'UTC',
      [],
      [23],
    )
    expect(results[0].toISOString()).toBe('2025-09-23T08:30:00.000Z')
  })

  it('should go to the next month if the day and time has passed', () => {
    const start = new Date('2025-09-23T10:00:00Z')
    const results = getNextDatetime(
      start,
      1,
      'months',
      ['08:30'],
      'UTC',
      [],
      [23],
    )
    expect(results[0].toISOString()).toBe('2025-10-23T08:30:00.000Z')
  })

  it('should handle a date later this month', () => {
    const start = new Date('2025-09-23T07:00:00Z')
    const results = getNextDatetime(
      start,
      1,
      'months',
      ['08:30'],
      'UTC',
      [],
      [28],
    )
    expect(results[0].toISOString()).toBe('2025-09-28T08:30:00.000Z')
  })

  it('should handle a date into next month', () => {
    const start = new Date('2025-09-23T07:00:00Z')
    const results = getNextDatetime(
      start,
      1,
      'months',
      ['08:30'],
      'UTC',
      [],
      [5],
    )
    expect(results[0].toISOString()).toBe('2025-10-05T08:30:00.000Z')
  })

  it('should return multiple dates', () => {
    const start = new Date('2025-09-23T10:00:00Z')
    const results = getNextDatetime(
      start,
      1,
      'days',
      ['08:30'],
      'UTC',
      [],
      [],
      3,
    )
    expect(results.length).toBe(3)
    expect(results[0].toISOString()).toBe('2025-09-24T08:30:00.000Z')
    expect(results[1].toISOString()).toBe('2025-09-25T08:30:00.000Z')
    expect(results[2].toISOString()).toBe('2025-09-26T08:30:00.000Z')
  })

  it('should return same date for 2 count as getting the time from previous call, just see the test', () => {
    const start = new Date('2025-09-23T10:00:00Z')
    const results = getNextDatetime(
      start,
      1,
      'days',
      ['08:30'],
      'UTC',
      [],
      [],
      2,
    )
    expect(results.length).toBe(2)
    const result1 = results[0].toISOString()
    const result2 = results[1].toISOString()
    expect(result1).toBe('2025-09-24T08:30:00.000Z')
    expect(result2).toBe('2025-09-25T08:30:00.000Z')

    const nextDate = new Date(result1)
    nextDate.setMinutes(nextDate.getMinutes() + 1)

    const nextResults = getNextDatetime(
      nextDate,
      1,
      'days',
      ['08:30'],
      'UTC',
      [],
      [],
      1,
    )

    console.log('nextResults', nextResults[0].toISOString())
    expect(nextResults[0].toISOString()).toBe(result2)
  })

  it('should throw an error for invalid start date', () => {
    const start = new Date('invalid-date')
    expect(() => getNextDatetime(start, 1, 'days')).toThrow(
      'invalid start date',
    )
  })

  it('should throw an error for non-positive amount', () => {
    const start = new Date('2025-09-23T10:00:00Z')
    expect(() => getNextDatetime(start, 0, 'days')).toThrow(
      'amount must be > 0',
    )
  })

  it('should throw an error for non-positive count', () => {
    const start = new Date('2025-09-23T10:00:00Z')
    expect(() =>
      getNextDatetime(
        start,
        1,
        'days',
        undefined,
        'UTC',
        undefined,
        undefined,
        0,
      ),
    ).toThrow('count must be > 0')
  })

  it('should throw an error if no occurrence found within max iterations', () => {
    const start = new Date('2025-09-23T10:00:00Z')
    expect(() =>
      getNextDatetime(
        start,
        1,
        'months',
        ['08:30'],
        'UTC',
        ['Monday'],
        [32],
        1,
      ),
    ).toThrow('no occurrence found')
  })

  it('should throw an error for invalid day name in daysOfWeek', () => {
    const start = new Date('2025-09-23T10:00:00Z')
    expect(() =>
      getNextDatetime(start, 1, 'weeks', ['08:30'], 'UTC', ['Funday'], [], 1),
    ).toThrow(
      'Invalid day name: Funday. Expected: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday',
    )
  })

  it('should throw an error for invalid day type in daysOfWeek', () => {
    const start = new Date('2025-09-23T10:00:00Z')
    expect(() =>
      getNextDatetime(start, 1, 'weeks', ['08:30'], 'UTC', [123 as any], [], 1),
    ).toThrow('Invalid day type: number. Expected string.')
  })
})
