'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from './ui/forms'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              {title && (
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                  {title}
                </h3>
              )}
              <Button
                type="button"
                color="secondary"
                variant="icon"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">{children}</div>
          </div>
        </div>
      </div>
    </>
  )
}
