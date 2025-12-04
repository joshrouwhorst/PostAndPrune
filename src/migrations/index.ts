// Umzug-based migration system
// This replaces the old custom migration system

export { createUmzugInstance, type MigrationContext } from './umzug.js'

// For backward compatibility, we provide a simple way to run migrations
// that can be used by scripts or other parts of the application
export async function runPendingMigrations() {
  const { createUmzugInstance } = await import('./umzug')
  const { MigrationService } = await import(
    '../app/api/services/MigrationService'
  )

  const appData = await MigrationService.getAppInfo()
  const service = new MigrationService(appData)
  const umzugInstance = createUmzugInstance(service)
  return umzugInstance.up()
}
