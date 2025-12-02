'use client'
import { useDraftContext } from '@/providers/DraftsProvider'
import { X } from 'lucide-react'
import { GroupSelect } from './GroupSelect'
import { Button, Input } from './ui/forms'

export default function DraftListFilters() {
  const { filters, addFilter, removeFilter, clearFilters } = useDraftContext()

  return (
    <div className="mb-4 flex flex-row items-center gap-4">
      <GroupSelect
        value={filters.group || ''}
        includeDefault={false}
        onChange={(group) => {
          if (!group) return removeFilter('group')
          addFilter('group', group)
        }}
      />

      <Input
        type="text"
        value={filters.searchTerm || ''}
        onChange={(e) => addFilter('searchTerm', e.target.value)}
        delay={500}
      />
      <Button
        onClick={clearFilters}
        title="Clear Filters"
        variant="primary"
        size="tall"
        color="danger"
      >
        <X />
      </Button>
    </div>
  )
}
