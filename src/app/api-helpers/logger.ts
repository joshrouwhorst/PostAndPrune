import { LOGS_PATH } from '@/config/main'
import { formatDate } from '@/helpers/utils'
import fs from 'node:fs'
import path from 'node:path'

const SHOW_OBJECTS_IN_LOGS = false // Set to false to disable logging objects
const DELETE_LOGS_OLDER_THAN_DAYS = 30

let lastPurgedLogs: Date | null = null

function getLogFilePath(): string {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0] // e.g., "2024-06-09"
  const filename = `backup-log-${dateStr}.txt`
  const resolvedPath = path.resolve(LOGS_PATH, filename)
  const dir = path.dirname(resolvedPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return resolvedPath
}

function padName(name: string): string {
  if (name.length >= 10) return name.slice(0, 10)
  return name + ' '.repeat(10 - name.length)
}

export default class Logger {
  private name: string

  constructor(name: string) {
    this.name = padName(name)
    this.removeOldLogs()
  }

  private removeOldLogs() {
    // Check if we purged in the last 24 hours, if so skip
    if (
      lastPurgedLogs &&
      Date.now() - lastPurgedLogs.getTime() < 24 * 60 * 60 * 1000
    ) {
      return null
    }

    // Check log directory for log files older than DELETE_LOGS_OLDER_THAN_DAYS and delete them
    if (!fs.existsSync(LOGS_PATH)) return
    const files = fs.readdirSync(LOGS_PATH)
    const now = Date.now()
    for (const file of files) {
      if (file.startsWith('backup-log-') && file.endsWith('.txt')) {
        const datePart = file.slice(11, 21) // Extract date part
        const fileDate = new Date(datePart)
        if (!Number.isNaN(fileDate.getTime())) {
          const ageInDays = (now - fileDate.getTime()) / (1000 * 60 * 60 * 24)
          if (ageInDays > DELETE_LOGS_OLDER_THAN_DAYS) {
            const filePath = path.join(LOGS_PATH, file)
            fs.unlinkSync(filePath)
          }
        }
      }
    }

    lastPurgedLogs = new Date()
  }

  private appendLine(message: string) {
    const line = `${formatDate(new Date())} | ${this.name} | ${message}\n`
    fs.appendFileSync(getLogFilePath(), line, 'utf-8')
    console.log(line.trim())
    this.removeOldLogs()
  }

  blank() {
    this.appendLine('')
  }

  blanks(count: number) {
    for (let i = 0; i < count; i++) {
      this.blank()
    }
  }

  divider() {
    this.appendLine('----------------------------------------')
  }

  opening(section: string) {
    this.blanks(2)
    this.appendLine(`********** START ${section} **********`)
  }

  closing(section: string) {
    this.appendLine(`********** END ${section} **********`)
    this.blanks(2)
  }

  // biome-ignore lint/suspicious/noExplicitAny: Needs to be generic
  log(message: string, object?: any) {
    this.appendLine(message)
    if (object && SHOW_OBJECTS_IN_LOGS) {
      this.appendLine(JSON.stringify(object, getCircularReplacer(), 2))
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Needs to be generic
  error(message: string, error?: any) {
    this.appendLine(`ERROR: ${message}`)
    if (error) {
      // Always show error objects in logs
      this.appendLine(
        `ERROR DETAILS: ${JSON.stringify(error, getCircularReplacer(), 2)}`,
      )
    }
  }
}

function getCircularReplacer() {
  const seen = new WeakSet<object>()
  return (_: unknown, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]'
      }
      seen.add(value)
      return value
    }
    // For primitives, just return the value
    return value
  }
}
