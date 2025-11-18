import { sortDaysOfTheWeek, to12HourTime } from '@/helpers/utils'
import type { Schedule, ScheduleFrequency } from '@/types/scheduler'

export default function ScheduleListItem({
  schedule,
}: {
  schedule: Schedule
  onEdit: (schedule: Schedule) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          {schedule.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
          Group: {schedule.group ?? 'NONE'}
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
          Accounts:{' '}
          {schedule.accounts?.length > 0
            ? schedule.accounts
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((acc) => acc.name)
                .join(', ')
            : 'None'}
        </p>
        <div className="flex items-center mt-2 space-x-4">
          <FrequencyOutput frequency={schedule.frequency} />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span
          className={`w-3 h-3 rounded-full ${
            schedule.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
      </div>
    </div>
  )
}

function FrequencyOutput({ frequency }: { frequency: ScheduleFrequency }) {
  const parts = []

  const unitPlural = frequency.interval.unit
  const unitSingle = unitPlural.replace(/s$/, '')
  const every = frequency.interval.every

  parts.push(`Every ${every === 1 ? unitSingle : `${every} ${unitPlural}`} `)

  if (frequency.daysOfWeek !== undefined && frequency.daysOfWeek.length > 0) {
    parts.push(`on ${sortDaysOfTheWeek(frequency.daysOfWeek).join(', ')}`)
  }

  if (frequency.daysOfMonth !== undefined && frequency.daysOfMonth.length > 0) {
    parts.push(`on day ${frequency.daysOfMonth.join(', ')}`)
  }

  if (frequency.timesOfDay !== undefined && frequency.timesOfDay.length > 0) {
    parts.push(`at ${frequency.timesOfDay.map(to12HourTime).join(', ')}`)
  }

  if (frequency.timeZone) {
    parts.push(`(${frequency.timeZone})`)
  }

  return parts.join(' ')
}
