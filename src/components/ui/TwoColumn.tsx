/** biome-ignore-all lint/suspicious/noArrayIndexKey: Need it for columns */
import clsx from 'clsx'
import React from 'react'
import { cloneElement } from 'react'

interface TwoColumnProps {
  reverseStack?: boolean
  stackPoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  children?: React.ReactNode
}

interface ColumnProps {
  children?: React.ReactNode
  stackPoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

export default function TwoColumn({
  reverseStack = false,
  stackPoint = 'md',
  children,
}: TwoColumnProps) {
  const setChildProps = (children: React.ReactNode) => {
    if (!children) return
    if (!Array.isArray(children)) return children

    return children.map((child, index) => {
      if (
        child &&
        typeof child === 'object' &&
        React.isValidElement(child) &&
        (child.type === Main || child.type === Side || child.type === Column)
      ) {
        const clone = cloneElement(child as React.ReactElement<ColumnProps>, {
          stackPoint,
          key: `two-column-child-${index}`,
        })
        return clone
      }
      return child
    })
  }

  let stackClasses = null
  switch (stackPoint) {
    case 'xs':
      stackClasses = 'w-full'
      break
    case 'sm':
      stackClasses = 'sm:flex-row'
      break
    case 'md':
      stackClasses = 'md:flex-row'
      break
    case 'lg':
      stackClasses = 'lg:flex-row'
      break
    case 'xl':
      stackClasses = 'xl:flex-row'
      break
    case '2xl':
      stackClasses = '2xl:flex-row'
      break
    default:
      stackClasses = 'md:flex-row'
      break
  }

  return (
    <div
      className={clsx(
        'w-full flex justify-center gap-4 items-baseline',
        stackClasses,
        reverseStack ? 'flex-col-reverse' : 'flex-col',
      )}
    >
      {setChildProps(children)}
    </div>
  )
}

function Column({ children, stackPoint = 'md', className }: ColumnProps) {
  let stackClasses = null
  switch (stackPoint) {
    case 'xs':
      stackClasses = 'w-full'
      break
    case 'sm':
      stackClasses = 'sm:w-1/2'
      break
    case 'md':
      stackClasses = 'md:w-1/2'
      break
    case 'lg':
      stackClasses = 'lg:w-1/2'
      break
    case 'xl':
      stackClasses = 'xl:w-1/2'
      break
    case '2xl':
      stackClasses = '2xl:w-1/2'
      break
    default:
      stackClasses = 'md:w-1/2'
      break
  }

  return (
    <div className={clsx('w-full px-4 py-6', stackClasses, className)}>
      {children}
    </div>
  )
}

function Main({ children, stackPoint = 'md', className }: ColumnProps) {
  let stackClasses = null
  switch (stackPoint) {
    case 'xs':
      stackClasses = 'w-full'
      break
    case 'sm':
      stackClasses = 'sm:w-2/3 xl:w-1/2'
      break
    case 'md':
      stackClasses = 'md:w-2/3 xl:w-1/2'
      break
    case 'lg':
      stackClasses = 'lg:w-2/3 xl:w-1/2'
      break
    case 'xl':
      stackClasses = 'xl:w-2/3 2xl:w-1/2'
      break
    case '2xl':
      stackClasses = '2xl:w-2/3'
      break
    default:
      stackClasses = 'md:w-2/3'
      break
  }

  return (
    <main className={clsx('w-full px-4 py-6', stackClasses, className)}>
      {children}
    </main>
  )
}

function Side({ children, stackPoint = 'md', className }: ColumnProps) {
  let stackClasses = null
  switch (stackPoint) {
    case 'xs':
      stackClasses = 'w-full'
      break
    case 'sm':
      stackClasses = 'sm:w-1/3 xl:w-1/2'
      break
    case 'md':
      stackClasses = 'md:w-1/3 xl:w-1/2'
      break
    case 'lg':
      stackClasses = 'lg:w-1/3 xl:w-1/2'
      break
    case 'xl':
      stackClasses = 'xl:w-1/3 2xl:w-1/2'
      break
    case '2xl':
      stackClasses = '2xl:w-1/3'
      break
    default:
      stackClasses = 'md:w-1/3'
      break
  }

  return (
    <aside className={clsx('w-full px-4 py-6', stackClasses, className)}>
      {children}
    </aside>
  )
}

TwoColumn.Main = Main
TwoColumn.Side = Side
TwoColumn.Column = Column
