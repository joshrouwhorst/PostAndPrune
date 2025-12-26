'use client'

import Toast, { type ToastProps } from '@/components/Toast'
import { createContext, useContext, useState, type ReactNode } from 'react'

interface NotificationContextType {
  showNotification: (
    notification: Omit<ToastProps, 'id'> & { duration?: number },
  ) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
)

interface NotificationWithId extends ToastProps {
  id: string
  duration?: number
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationWithId[]>([])

  const showNotification = (
    notification: Omit<ToastProps, 'id'> & { duration?: number },
  ) => {
    const id = crypto.randomUUID()
    const newNotification: NotificationWithId = {
      ...notification,
      id,
      duration: notification.duration || 5000,
    }

    setNotifications((prev) => [...prev, newNotification])

    // Auto-remove notification after duration
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, newNotification.duration)
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}

      {/* Notification Container */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {notifications.map((notification) => (
            <div key={notification.id} className="relative">
              <Toast message={notification.message} type={notification.type} />
              <button
                onClick={() => removeNotification(notification.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error(
      'useNotification must be used within a NotificationProvider',
    )
  }
  return context
}
