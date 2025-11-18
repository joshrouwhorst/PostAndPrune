'use client'
import { CheckIcon, CircleAlertIcon, CircleXIcon, InfoIcon } from 'lucide-react'
import type React from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastProps {
  message: string
  type: ToastType
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-100 border-green-500 text-green-800',
  error: 'bg-red-100 border-red-500 text-red-800',
  info: 'bg-blue-100 border-blue-500 text-blue-800',
  warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
}

const typeIcons: Record<ToastType, React.ReactElement> = {
  success: <CheckIcon className="w-5 h-5 mr-2 text-green-500" />,
  error: <CircleXIcon className="w-5 h-5 mr-2 text-red-500" />,
  info: <InfoIcon className="w-5 h-5 mr-2 text-blue-500" />,
  warning: <CircleAlertIcon className="w-5 h-5 mr-2 text-yellow-500" />,
}

const Toast: React.FC<ToastProps> = ({ message, type }) => {
  return (
    <div
      className={`flex items-center px-4 py-3 border-l-4 rounded shadow-md mb-2 ${typeStyles[type]}`}
      role="alert"
    >
      {typeIcons[type]}
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

export default Toast
