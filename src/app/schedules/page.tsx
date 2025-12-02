'use client'
import { useState } from 'react'
import type { Schedule } from '@/types/scheduler'
import AppDataProvider from '@/providers/AppDataProvider'
import ScheduleList from '@/components/schedules/ScheduleList'
import ScheduleDetails from '@/components/schedules/ScheduleDetails'
import ScheduleEditForm from '@/components/schedules/ScheduleEditForm'
import ScheduleProvider from '@/providers/ScheduleProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import DraftProvider from '@/providers/DraftsProvider'

export default function SchedulesPage() {
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null,
  )
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Schedule>>({})

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setEditForm(schedule)
    setIsEditing(true)
  }

  const handleSave = async () => {
    setIsEditing(false)
    setSelectedSchedule(null)
    setEditForm({})
  }

  const handleDelete = async () => {
    setSelectedSchedule(null)
  }

  const handleCreateNew = () => {
    setSelectedSchedule(null)
    setEditForm({})
    setIsEditing(true)
  }

  return (
    <AppDataProvider>
      <DraftProvider>
        <ScheduleProvider>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow max-w-xl mx-auto">
            {/* Schedule List */}
            {!selectedSchedule && !isEditing && (
              <ErrorBoundary>
                <ScheduleList
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCreateNew={handleCreateNew}
                  selectedSchedule={selectedSchedule}
                  setSelectedSchedule={setSelectedSchedule}
                />
              </ErrorBoundary>
            )}

            {selectedSchedule && !isEditing && (
              <ErrorBoundary>
                <ScheduleDetails
                  schedule={selectedSchedule}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onBack={() => setSelectedSchedule(null)}
                />
              </ErrorBoundary>
            )}

            {/* Edit Panel */}
            {isEditing && (
              <ErrorBoundary>
                <ScheduleEditForm
                  schedule={selectedSchedule}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              </ErrorBoundary>
            )}
          </div>
        </ScheduleProvider>
      </DraftProvider>
    </AppDataProvider>
  )
}
