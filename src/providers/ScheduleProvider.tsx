'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type {
  CreateScheduleRequest,
  Schedule,
  ScheduleLookups,
} from '@/types/scheduler'
import { useSchedules } from '@/hooks/useSchedules'

interface SchedulesContextType {
  schedules: Schedule[]
  isLoading: boolean
  refresh: () => Promise<void>
  createSchedule: (input: CreateScheduleRequest) => Promise<Schedule>
  updateSchedule: (input: Schedule) => Promise<Schedule>
  deleteSchedule: (id: string) => Promise<void>
  triggerSchedule: (scheduleId: string) => Promise<void>
  getScheduleLookups: (scheduleId: string) => Promise<ScheduleLookups | null>
  reorderSchedulePosts: (
    scheduleId: string,
    newOrder: string[],
  ) => Promise<void>
}

// Create the context
const ScheduleContext = createContext<SchedulesContextType | undefined>(
  undefined,
)

interface ScheduleProviderProps {
  children: ReactNode
}

export default function ScheduleProvider({ children }: ScheduleProviderProps) {
  const {
    schedules,
    loading,
    refresh,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    triggerSchedule,
    getScheduleLookups,
    reorderSchedulePosts,
  } = useSchedules()

  const contextValue: SchedulesContextType = {
    schedules,
    isLoading: loading,
    refresh,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    triggerSchedule,
    getScheduleLookups,
    reorderSchedulePosts,
  }

  return (
    <ScheduleContext.Provider value={contextValue}>
      {children}
    </ScheduleContext.Provider>
  )
}

export const useScheduleContext = () => {
  const context = useContext(ScheduleContext)
  if (context === undefined) {
    throw new Error('useScheduleContext must be used within a ScheduleProvider')
  }
  return context
}
