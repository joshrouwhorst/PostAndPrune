export interface LogFile {
  filename: string
  date: string
  size: number
}

export interface LogFileContent {
  filename: string
  content: string
}

export interface LogsHookContext {
  logFiles: LogFile[]
  loading: boolean
  error: Error | null
  fetchLogFiles: () => Promise<LogFile[]>
  fetchLogFileContent: (filename: string) => Promise<LogFileContent>
  deleteLogFile: (filename: string) => Promise<void>
}
