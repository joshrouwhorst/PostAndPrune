'use client'
import type { ReactElement } from 'react'
import { useState, useRef, cloneElement } from 'react'
import clsx from 'clsx'

interface DragDropListProps {
  children: ReactElement<DragDropItemProps>[] | ReactElement<DragDropItemProps>
  onChange: (newOrder: string[]) => void
  className?: string
}

interface DragDropItemProps {
  children: React.ReactNode
  className?: string
  key: string
}

interface DragState {
  draggedIndex: number | null
  draggedOverIndex: number | null
  isDragging: boolean
  dragPosition?: 'top' | 'bottom'
}

function DragDropListRoot({
  children,
  onChange,
  className,
}: DragDropListProps) {
  if (!children) {
    children = []
  } else if (!Array.isArray(children)) {
    children = [children]
  }

  const [dragState, setDragState] = useState<DragState>({
    draggedIndex: null,
    draggedOverIndex: null,
    isDragging: false,
    dragPosition: undefined,
  })

  const draggedElementRef = useRef<HTMLElement | null>(null)
  const itemsRef = useRef<(HTMLLIElement | null)[]>([])

  // Extract keys from children - avoid Children.toArray() as it modifies keys
  const childrenArray = Array.isArray(children) ? children : [children]
  const itemKeys = childrenArray.map((child) => {
    // Extract original key from props, not from React's processed key
    const originalKey = child.key
    // Remove React's .$ prefix if it exists
    if (typeof originalKey === 'string' && originalKey.startsWith('.$')) {
      return originalKey.substring(2)
    }
    return originalKey as string
  })

  const handleDragStart = (index: number, event: React.DragEvent) => {
    setDragState({
      draggedIndex: index,
      draggedOverIndex: null,
      isDragging: true,
      dragPosition: undefined,
    })

    // Store reference to the dragged element
    draggedElementRef.current = event.currentTarget as HTMLElement

    // Set drag data
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', '')

    // Add some visual feedback
    setTimeout(() => {
      if (draggedElementRef.current) {
        draggedElementRef.current.style.opacity = '0.5'
      }
    }, 0)
  }

  const handleDragEnd = () => {
    // Reset visual feedback
    if (draggedElementRef.current) {
      draggedElementRef.current.style.opacity = '1'
    }

    setDragState({
      draggedIndex: null,
      draggedOverIndex: null,
      isDragging: false,
      dragPosition: undefined,
    })

    draggedElementRef.current = null
  }

  const handleDragOver = (index: number, event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'

    if (dragState.draggedIndex !== null && dragState.draggedIndex !== index) {
      setDragState((prev) => ({
        ...prev,
        draggedOverIndex: index,
        dragPosition: mouseDropPosition(index, event),
      }))
    }
  }

  const handleDragLeave = () => {
    setDragState((prev) => ({
      ...prev,
      draggedOverIndex: null,
      dragPosition: undefined,
    }))
  }

  const handleDrop = (index: number, event: React.DragEvent) => {
    event.preventDefault()
    console.log('Drop event at index:', index)

    if (dragState.draggedIndex === null || dragState.draggedIndex === index) {
      console.log('No valid drag operation detected.')
      return
    }

    const goingDown = dragState.draggedIndex < index

    const position = mouseDropPosition(index, event)
    console.log('Drop position:', position)

    const newOrder = [...itemKeys]
    const draggedItem = newOrder[dragState.draggedIndex]

    console.log('Dragged item:', draggedItem)

    // Remove the dragged item
    newOrder.splice(dragState.draggedIndex, 1)

    // Adjust for placing above or below current item
    index = position === 'top' || goingDown ? index : index + 1

    console.log('Adjusted index for drop:', index)

    // Insert at new position
    newOrder.splice(index, 0, draggedItem)
    console.log('New order after drop:', newOrder)

    onChange(newOrder)

    setDragState({
      draggedIndex: null,
      draggedOverIndex: null,
      isDragging: false,
      dragPosition: undefined,
    })
  }

  const mouseDropPosition = (
    index: number,
    event: React.DragEvent,
  ): 'top' | 'bottom' => {
    const el = itemsRef.current[index]
    if (!el) return 'bottom'

    const rect = el.getBoundingClientRect()
    const offsetY = event.clientY - rect.top

    // If pointer is in the top half of the element, return 'top', otherwise 'bottom'
    return offsetY < rect.height / 2 ? 'top' : 'bottom'
  }

  return (
    <ul className={clsx('space-y-1', className)}>
      {childrenArray.map((child, index) => {
        const isDragged = dragState.draggedIndex === index
        const isDraggedOver = dragState.draggedOverIndex === index
        const isTop = dragState.dragPosition === 'top' && isDraggedOver
        const isBottom = dragState.dragPosition === 'bottom' && isDraggedOver

        return (
          <li
            key={child.key}
            ref={(el) => {
              itemsRef.current[index] = el
            }}
            draggable
            onDragStart={(e) => handleDragStart(index, e)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(index, e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(index, e)}
            className={clsx(
              'relative transition-all duration-150 ease-in-out',
              'cursor-grab active:cursor-grabbing',
              'border-2 border-transparent rounded-lg',
              {
                // Dragged item styling
                'opacity-50 scale-95 shadow-lg border-blue-300': isDragged,
                // Drag over styling
                'border-blue-400 bg-blue-50 dark:bg-blue-900/20':
                  isDraggedOver && !isDragged,
                // Hover effect when not dragging
                'hover:bg-gray-50 dark:hover:bg-gray-800/50':
                  !dragState.isDragging,
                // 'border-t-4': isTop,
                // 'border-b-4': isBottom,
              },
            )}
            style={{
              // Add some visual spacing when dragging over
              marginTop:
                dragState.dragPosition === 'top' && dragState.isDragging
                  ? '8px'
                  : undefined,
              marginBottom:
                dragState.dragPosition === 'bottom' && dragState.isDragging
                  ? '8px'
                  : undefined,
            }}
          >
            {/* Drop zone indicator line above */}
            {isTop && <Indicator position="top" />}

            {/* Main content */}
            <div
              className={clsx('p-3 rounded-lg transition-all duration-150', {
                'bg-white dark:bg-gray-900 shadow-sm': !isDraggedOver,
                'bg-blue-50 dark:bg-blue-900/30': isDraggedOver && !isDragged,
              })}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  {cloneElement(child, {
                    ...child.props,
                    className: clsx(child.props.className, 'select-none'),
                  })}
                </div>
              </div>
            </div>

            {/* Drop zone indicator line below */}
            {isBottom && <Indicator position="bottom" />}
          </li>
        )
      })}
    </ul>
  )
}

function DragDropItem({ children, className }: DragDropItemProps) {
  return <div className={className}>{children}</div>
}

function Indicator({ position }: { position: 'top' | 'bottom' }) {
  return position === 'top' ? (
    <div className="h-2 bg-blue-500 rounded-full my-2" />
  ) : (
    <div className="h-2 bg-red-500 rounded-full my-2" />
  )
}

// Create compound component
const DragDropList = Object.assign(DragDropListRoot, {
  Item: DragDropItem,
})

export default DragDropList
