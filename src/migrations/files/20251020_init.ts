import type { MigrationContext } from '../umzug.js'

export async function up(context: MigrationContext) {
  console.log('Running migration: Initial setup')
  // Example migration: Add a new field to app metadata
}

export async function down(context: MigrationContext) {
  console.log('Rolling back migration: Initial setup')
  // Example rollback: Remove the new field from app metadata
}
