import React, { useEffect, useState } from 'react'
import { useGroups } from '@/hooks/useGroups'
import { Select } from './ui/forms'
import { DEFAULT_GROUP } from '@/config/frontend'

interface GroupSelectProps {
  value?: string
  includeDefault?: boolean
  onChange: (group: string) => void
}

export function GroupSelect({
  value,
  includeDefault = true,
  onChange,
}: GroupSelectProps) {
  const [groups, setGroups] = useState<string[]>([])
  const { fetchGroups } = useGroups()

  useEffect(() => {
    const getGroups = async () => {
      const data = await fetchGroups()
      if (!includeDefault && data.includes(DEFAULT_GROUP)) {
        data.splice(data.indexOf(DEFAULT_GROUP), 1)
      }
      setGroups(data)
    }
    getGroups()
  }, [fetchGroups, includeDefault])

  return (
    <Select
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
        onChange(e.target.value)
      }
      value={value}
    >
      <Select.Option value="">No Group</Select.Option>
      {groups.map((group) => (
        <Select.Option key={group} value={group}>
          {group}
        </Select.Option>
      ))}
    </Select>
  )
}
