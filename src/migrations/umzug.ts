import type { MigrationService } from '../app/api/services/MigrationService.js'
import fs from 'node:fs'
import path from 'node:path'
import { Umzug } from 'umzug'

// Custom storage adapter for JSON file
class JSONStorage {
  private readonly path: string

  constructor(options: { path: string }) {
    this.path = options.path
  }

  async logMigration({ name }: { name: string }): Promise<void> {
    const migrations = await this.executed()
    migrations.push(name)

    const data = {
      migrations,
      lastMigration: new Date().toISOString(),
    }

    fs.writeFileSync(this.path, JSON.stringify(data, null, 2))
  }

  async unlogMigration({ name }: { name: string }): Promise<void> {
    const migrations = await this.executed()
    const index = migrations.indexOf(name)

    if (index > -1) {
      migrations.splice(index, 1)
    }

    const data = {
      migrations,
      lastMigration: new Date().toISOString(),
    }

    fs.writeFileSync(this.path, JSON.stringify(data, null, 2))
  }

  async executed(): Promise<string[]> {
    if (!fs.existsSync(this.path)) {
      return []
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.path, 'utf-8'))
      return data.migrations || []
    } catch {
      return []
    }
  }
}

// Migration context that will be passed to each migration
export interface MigrationContext {
  service: MigrationService
}

const MIGRATION_STORAGE_PATH = path.join(process.cwd(), '.migrations.json')
const MIGRATIONS_PATH = path.join(process.cwd(), 'src/migrations/files')

// Helper function to create Umzug instance with context
export function createUmzugInstance(service: MigrationService) {
  return new Umzug({
    migrations: {
      glob: ['*.{js,ts}', { cwd: MIGRATIONS_PATH }],
      resolve: ({ name, path: migrationPath, context }) => ({
        name,
        up: async () => {
          const migration = await import(migrationPath!)
          if (migration.up && typeof migration.up === 'function') {
            return migration.up(context)
          }
          throw new Error(`Migration ${name} does not export an 'up' function`)
        },
        down: async () => {
          const migration = await import(migrationPath!)
          if (migration.down && typeof migration.down === 'function') {
            return migration.down(context)
          }
          throw new Error(`Migration ${name} does not export a 'down' function`)
        },
      }),
    },
    context: { service },
    storage: new JSONStorage({ path: MIGRATION_STORAGE_PATH }),
    logger: console,
  })
}

export type Migration = Umzug<MigrationContext>['_types']['migration']
