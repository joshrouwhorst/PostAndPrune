import NextLink from 'next/link'

export default function Link({
  href,
  variant = 'primary',
  children,
  className,
  ...props
}: React.ComponentProps<typeof NextLink> & {
  variant?: 'primary' | 'success' | 'danger' | 'warning'
  children: React.ReactNode
}) {
  let variantClasses = ''
  switch (variant) {
    case 'success':
      variantClasses = 'text-green-400'
      break
    case 'danger':
      variantClasses = 'text-red-400'
      break
    case 'warning':
      variantClasses = 'text-yellow-400'
      break
    default:
      variantClasses = 'text-blue-400'
      break
  }
  const baseClasses = `${variantClasses} hover:text-inherit underline hover:no-underline`

  className = className ? `${baseClasses} ${className}` : baseClasses
  return (
    <NextLink href={href} className={className} {...props}>
      {children}
    </NextLink>
  )
}
