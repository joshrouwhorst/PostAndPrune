import type { MigrationContext } from '../umzug.js'

export async function up({ service }: MigrationContext) {
  // Example migration: Add a new field to app metadata
  if (service.isPreviousVersionLessThan('0.1.1')) {
    console.log('Migrating to 0.1.1: <description>')
  }
}

export async function down({ service }: MigrationContext) {
  // Example rollback: Remove the new field from app metadata
  if (service.isPreviousVersionGreaterThan('0.1.0')) {
    console.log('Reverting migration to 0.1.0: <description>')
  }
}
