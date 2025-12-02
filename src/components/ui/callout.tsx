import { ReactNode } from 'react'

type CalloutVariant = 'primary' | 'success' | 'danger' | 'info'

interface CalloutProps {
  variant?: CalloutVariant
  children: ReactNode
  className?: string
}

const variantStyles: Record<CalloutVariant, string> = {
  primary:
    'bg-blue-50 border-blue-400 text-blue-900 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-100',
  success:
    'bg-green-50 border-green-400 text-green-900 dark:bg-green-950 dark:border-green-600 dark:text-green-100',
  danger:
    'bg-red-50 border-red-400 text-red-900 dark:bg-red-950 dark:border-red-600 dark:text-red-100',
  info: 'bg-sky-50 border-sky-400 text-sky-900 dark:bg-sky-950 dark:border-sky-600 dark:text-sky-100',
}

function joinClasses(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function Callout({
  variant = 'primary',
  children,
  className,
}: CalloutProps) {
  return (
    <div
      className={joinClasses(
        'border p-4 rounded-md',
        variantStyles[variant],
        className,
      )}
      role="alert"
    >
      {children}
    </div>
  )
}
