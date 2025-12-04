import { APP_DATA_FILE } from '@/config/main'
import fs from 'node:fs'
import path from 'node:path'
import { readEncryptedText, writeEncryptedFile } from './FileService'

export interface AppInfo {
  version: string
  previousVersion: string
  // migrations field is now handled by Umzug storage
}

export class MigrationService {
  app: AppInfo

  constructor(app: AppInfo) {
    this.app = app
  }

  // Get app version info from package.json and version tracking file
  static async getAppInfo(): Promise<AppInfo> {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const versionTrackingPath = path.join(process.cwd(), '.app-version.json')

    const packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    const currentVersion = packageInfo.version

    let previousVersion = currentVersion

    try {
      if (fs.existsSync(versionTrackingPath)) {
        const versionData = JSON.parse(
          fs.readFileSync(versionTrackingPath, 'utf-8'),
        )
        previousVersion = versionData.version || currentVersion
      }
    } catch (error) {
      console.warn('Could not read version tracking file:', error)
    }

    // Update version tracking file
    try {
      fs.writeFileSync(
        versionTrackingPath,
        JSON.stringify(
          {
            version: currentVersion,
            previousVersion,
            lastUpdated: new Date().toISOString(),
          },
          null,
          2,
        ),
      )
    } catch (error) {
      console.warn('Could not write version tracking file:', error)
    }

    return {
      version: currentVersion,
      previousVersion,
    }
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
    const oldAppData = await readEncryptedText(APP_DATA_FILE)
    if (!oldAppData) {
      console.warn('No existing app data found during migration.')
      return
    }

    const appData = JSON.parse(oldAppData)
    return appData
  }

  async saveAppData(data: string | object): Promise<void> {
    await writeEncryptedFile(APP_DATA_FILE, JSON.stringify(data))
  }
}
