/** biome-ignore-all lint/style/noNonNullAssertion: needed for schedule.id, only going to get called if it exists */

import { formatFullDateTime, to12HourTime } from '@/helpers/utils'
import { useScheduleContext } from '@/providers/ScheduleProvider'
import type { Schedule, ScheduleLookups } from '@/types/scheduler'
import {
  ArrowDownUpIcon,
  ArrowLeftIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import Post from '../Post'
import { Button, Label, LinkButton } from '../ui/forms'

export default function ScheduleDetails({
  schedule,
  onEdit,
  onDelete,
  onBack,
}: {
  schedule: Schedule
  onEdit: (schedule: Schedule) => void
  onDelete: (id: string) => void
  onBack: () => void
}) {
  const { deleteSchedule, triggerSchedule, getScheduleLookups } =
    useScheduleContext()
  const [lookups, setLookups] = useState<ScheduleLookups | null>(null)
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      await deleteSchedule(id)
      onDelete(id)
    }
  }

  const handleTrigger = async (id: string) => {
    if (confirm('Are you sure you want to post this schedule now?')) {
      await triggerSchedule(id)
      alert('Schedule posted successfully!')
    }
  }

  useEffect(() => {
    const fetchScheduleLookups = async () => {
      const next = await getScheduleLookups(schedule.id!)
      if (next) {
        setLookups(next)
      } else {
        setLookups(null)
      }
    }
    fetchScheduleLookups()
  }, [schedule.id, getScheduleLookups])

  return (
    <div className="p-6">
      <div className="flex flex-row justify-between gap-4">
        <div className="w-2/3">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {schedule.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ID: {schedule.id ?? 'NONE'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Group: {schedule.group ?? 'NONE'}
              </p>
              {schedule.accounts && schedule.accounts.length > 0 ? (
                <p>
                  Accounts
                  <ul>
                    {schedule.accounts.map((acc) => (
                      <li
                        key={acc.id}
                        className="text-gray-900 dark:text-gray-100"
                      >
                        {acc.name} ({acc.platform})
                      </li>
                    ))}
                  </ul>
                </p>
              ) : null}
            </div>
            <div className="flex flex-row gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Start Time
                </span>
                <p className="text-gray-900 dark:text-gray-100">
                  {schedule.startTime
                    ? formatFullDateTime(new Date(schedule.startTime))
                    : 'Immediate'}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  End Time
                </span>
                <p className="text-gray-900 dark:text-gray-100">
                  {schedule.endTime
                    ? formatFullDateTime(new Date(schedule.endTime))
                    : 'None'}
                </p>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Interval
              </span>
              <p className="text-gray-900 dark:text-gray-100 capitalize">
                {schedule.frequency.interval.every}{' '}
                {schedule.frequency.interval.unit}
              </p>
            </div>
            {schedule.frequency.timesOfDay &&
            schedule.frequency.timesOfDay.length > 0 ? (
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Times Of Day
                </span>
                <p className="text-gray-900 dark:text-gray-100">
                  {schedule.frequency.timesOfDay.length > 0
                    ? schedule.frequency.timesOfDay.map(to12HourTime).join(', ')
                    : 'N/A'}
                </p>
              </div>
            ) : null}
            {schedule.frequency.timeZone ? (
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Time Zone
                </span>
                <p className="text-gray-900 dark:text-gray-100">
                  {schedule.frequency.timeZone}
                </p>
              </div>
            ) : null}
            {schedule.frequency.daysOfWeek &&
            schedule.frequency.daysOfWeek.length > 0 ? (
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Days of the Week
                </span>
                <p className="text-gray-900 dark:text-gray-100">
                  {schedule.frequency.daysOfWeek.join(', ')}
                </p>
              </div>
            ) : null}
            {schedule.frequency.daysOfMonth &&
            schedule.frequency.daysOfMonth.length > 0 ? (
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Days of Month
                </span>
                <p className="text-gray-900 dark:text-gray-100">
                  {schedule.frequency.daysOfMonth.join(', ')}
                </p>
              </div>
            ) : null}

            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </span>
              <p
                className={`${
                  schedule.isActive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {schedule.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
        <div className="w-1/3 flex flex-col gap-2">
          <Button
            onClick={() => onBack()}
            color="secondary"
            variant="secondary"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={() => onEdit(schedule)}
            color="primary"
            variant="primary"
          >
            <PencilIcon className="w-4 h-4 mr-1" /> Edit Schedule
          </Button>
          <Button
            onClick={() => schedule.id && handleDelete(schedule.id)}
            color="danger"
            variant="primary"
          >
            <TrashIcon className="w-4 h-4 mr-1" /> Delete Schedule
          </Button>
          {lookups?.nextPosts && lookups.nextPosts.length > 0 && (
            <Button
              onClick={() => schedule.id && handleTrigger(schedule.id)}
              variant="primary"
              color="tertiary"
            >
              <ShareIcon className="w-4 h-4 mr-1" /> Post Now
            </Button>
          )}
          {schedule.id && (
            <LinkButton
              href={`/schedules/${encodeURIComponent(schedule.id)}`}
              variant="secondary"
              color="primary"
            >
              <ArrowDownUpIcon className="w-4 h-4 mr-1" /> Order Posts
            </LinkButton>
          )}
        </div>
      </div>
      {lookups && lookups.nextPostDates.length > 0 ? (
        <div className="mt-4">
          <Label>Next Post Date</Label>
          <div>{formatFullDateTime(lookups.nextPostDates[0])}</div>
        </div>
      ) : (
        <div className="mt-4 font-bold">No next post date available.</div>
      )}
      {lookups?.nextPosts && lookups.nextPosts.length > 0 ? (
        <div className="mt-4">
          <Label>Next Post</Label>
          <Post draftPost={lookups.nextPosts[0]} variant="compact" />
        </div>
      ) : (
        <div className="mt-4 font-bold">No upcoming posts.</div>
      )}
    </div>
  )
}
