import type React from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'icon'
type Size = 'xxs' | 'xs' | 'sm' | 'md' | 'lg'
type Color = 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger'

const baseButtonClasses =
  'font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed items-center justify-center flex gap-2'

const baseLinkClasses = `${baseButtonClasses} no-underline inline-flex`

const getColorClasses = (variant: Variant, color: Color) => {
  if (variant === 'icon') {
    return {
      primary:
        'bg-transparent hover:bg-blue-100 dark:hover:bg-gray-900 dark:hover:text-blue-400 text-blue-600 dark:text-blue-400 focus:ring-blue-500',
      secondary:
        'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-300 dark:hover:text-gray-800 text-gray-700 dark:text-gray-300 focus:ring-gray-500',
      tertiary:
        'bg-transparent hover:bg-green-100 dark:hover:bg-green-900 text-green-600 dark:text-green-400 focus:ring-green-500',
      success:
        'bg-transparent hover:bg-green-100 dark:hover:bg-green-900 text-green-600 dark:text-green-400 focus:ring-green-500',
      danger:
        'bg-transparent hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 focus:ring-red-500',
    }[color]
  } else if (variant === 'primary') {
    return {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
      tertiary:
        'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
      success:
        'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    }[color]
  } else if (variant === 'secondary') {
    return {
      primary:
        'bg-blue-100 hover:bg-blue-200 text-blue-900 focus:ring-blue-500',
      secondary:
        'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500',
      tertiary:
        'bg-green-100 hover:bg-green-200 text-green-900 focus:ring-green-500',
      success:
        'bg-green-100 hover:bg-green-200 text-green-900 focus:ring-green-500',
      danger: 'bg-red-100 hover:bg-red-200 text-red-900 focus:ring-red-500',
    }[color]
  } else {
    // outline
    return {
      primary:
        'border border-blue-300 hover:bg-blue-50 text-blue-700 focus:ring-blue-500',
      secondary:
        'border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-gray-500',
      tertiary:
        'border border-green-300 hover:bg-green-50 text-green-700 focus:ring-green-500',
      success:
        'border border-green-300 hover:bg-green-50 text-green-700 focus:ring-green-500',
      danger:
        'border border-red-300 hover:bg-red-50 text-red-700 focus:ring-red-500',
    }[color]
  }
}

const getSizeClasses = (variant: Variant, size: string) => {
  if (variant === 'icon') return 'p-2 rounded-full text-base leading-none flex'

  switch (size) {
    case 'tall':
      return 'px-3 py-4 text-sm'
    case 'md':
    default:
      return 'px-4 py-2 text-sm'
  }
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'tall'
  color?: Color
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  color = 'primary',
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      className={`${baseButtonClasses} ${getColorClasses(
        variant,
        color
      )} ${getSizeClasses(variant, size)} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

interface LinkButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant
  size?: Size
  color?: Color
  href: string
  target?: string
}

export const LinkButton: React.FC<LinkButtonProps> = ({
  variant = 'primary',
  size = 'md',
  color = 'primary',
  className = '',
  children,
  href,
  target,
  ...props
}) => {
  return (
    <a
      href={href}
      target={target}
      className={`${baseLinkClasses} ${getColorClasses(
        variant,
        color
      )} ${getSizeClasses(variant, size)} ${className}`}
      {...props}
    >
      {children}
    </a>
  )
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea: React.FC<TextareaProps> = ({
  className = '',
  ...props
}) => {
  return (
    <textarea
      className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-vertical ${className}`}
      {...props}
    />
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  delay?: number
}

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  return (
    <input
      className={`block text-sm w-full px-3 py-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${className}`}
      {...props}
    />
  )
}

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label: React.FC<LabelProps> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Handled by caller
    <label
      className={`block font-bold text-sm text-gray-700 dark:text-gray-200 mb-1 ${className}`}
      {...props}
    >
      {children}
    </label>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

interface SelectOptionProps
  extends React.OptionHTMLAttributes<HTMLOptionElement> {}

const SelectOption: React.FC<SelectOptionProps> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <option className={className} {...props}>
      {children}
    </option>
  )
}

export const Select: React.FC<SelectProps> & {
  Option: React.FC<SelectOptionProps>
} = ({ className = '', ...props }) => {
  return (
    <select
      className={`block w-full px-3 py-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${className}`}
      {...props}
    />
  )
}

Select.Option = SelectOption

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox: React.FC<CheckboxProps> = ({
  className = '',
  ...props
}) => {
  return (
    <input
      type="checkbox"
      className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${className}`}
      {...props}
    />
  )
}
