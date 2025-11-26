// Auto-generated index file for migrations
// This file automatically imports all migration modules and exports them as an array

import type { MigrationService } from '../src/app/api/services/MigrationService.js'
import * as migration_20251020_init from './20251020_init.js'
import * as migration_20251122_multiaccount from './20251122_multiaccount.js'

const FILES = [
  {
    filename: '20251020_init.ts',
    module: migration_20251020_init,
  },
  {
    filename: '20251122_multiaccount.ts',
    module: migration_20251122_multiaccount,
  },
]

// Type definition for migration modules
export interface MigrationModule {
  up: (service: MigrationService) => Promise<void>
  down: (service: MigrationService) => Promise<void>
}

// Array of all migration modules in chronological order
export const migrations: MigrationModule[] = FILES.map((file) => file.module)

// Export individual migrations for direct access if needed
export { migration_20251020_init, migration_20251122_multiaccount }

// Helper function to get migration by filename
export function getMigrationByFilename(
  filename: string
): MigrationModule | undefined {
  const migrationMap: Record<string, MigrationModule> = FILES.reduce(
    (map, file) => {
      map[file.filename] = file.module
      return map
    },
    {} as Record<string, MigrationModule>
  )
  return migrationMap[filename]
}

// Helper function to get all migration filenames
export function getAllMigrationFilenames(): string[] {
  return FILES.map((file) => file.filename)
}
