// Auto-generated index file for migrations
// This file automatically imports all migration modules and exports them as an array

import type { MigrationService } from '../src/app/api/services/MigrationService.js'
import * as migration_20251020_init from './20251020_init.js'
import * as migration_20251122_multiaccount from './20251122_multiaccount.js'

// Type definition for migration modules
export interface MigrationModule {
  up: (service: MigrationService) => Promise<void>
  down: (service: MigrationService) => Promise<void>
}

// Array of all migration modules in chronological order
export const migrations: MigrationModule[] = [
  migration_20251020_init,
  migration_20251122_multiaccount,
]

// Export individual migrations for direct access if needed
export { migration_20251020_init, migration_20251122_multiaccount }

// Helper function to get migration by filename
export function getMigrationByFilename(
  filename: string
): MigrationModule | undefined {
  const migrationMap: Record<string, MigrationModule> = {
    '20251020_init.ts': migration_20251020_init,
    '20251122_multiaccount.ts': migration_20251122_multiaccount,
  }
  return migrationMap[filename]
}

// Helper function to get all migration filenames
export function getAllMigrationFilenames(): string[] {
  return ['20251020_init.ts', '20251122_multiaccount.ts']
}
