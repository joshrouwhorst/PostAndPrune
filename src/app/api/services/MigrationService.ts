import { saveJsonToFile } from '@/app/api-helpers/utils'
import { APP_DATA_FILE } from '@/config/main'
import { readText } from './FileService'

export interface AppInfo {
  version: string
  previousVersion: string
  migrations: string[]
}

export class MigrationService {
  app: AppInfo

  constructor(app: AppInfo) {
    this.app = app
  }

  needToMigrate() {
    return !!this.app.previousVersion
  }

  isPreviousVersionLessThan(version: string) {
    return this.compareVersions(this.app.previousVersion, version) === -1
  }

  isPreviousVersionGreaterThan(version: string) {
    return this.compareVersions(this.app.previousVersion, version) === 1
  }

  isVersionLessThan(version: string) {
    return this.compareVersions(this.app.version, version) === -1
  }

  isVersionGreaterThan(version: string) {
    return this.compareVersions(this.app.version, version) === 1
  }

  /**
   * Compare two semantic version strings.
   * Returns -1 if second < first, 0 if equal, 1 if second > first.
   */
  compareVersions(first: string, second: string): number {
    const toNums = (v: string) =>
      String(v)
        .trim()
        .split('.')
        .map((part) => {
          const m = part.match(/^(\d+)/)
          return m ? parseInt(m[1], 10) : 0
        })

    const a = toNums(first)
    const b = toNums(second)
    const len = Math.max(a.length, b.length)

    for (let i = 0; i < len; i++) {
      const ai = a[i] ?? 0
      const bi = b[i] ?? 0
      if (bi > ai) return 1
      if (bi < ai) return -1
    }
    return 0
  }

  async getAppData() {
    const oldAppData = await readText(APP_DATA_FILE)
    if (!oldAppData) {
      console.warn('No existing app data found during migration.')
      return
    }

    const appData = JSON.parse(oldAppData)
    return appData
  }

  async saveAppData(data: string | object): Promise<void> {
    await saveJsonToFile(data, APP_DATA_FILE)
  }
}
