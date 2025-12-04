#!/usr/bin/env node
import { Command } from 'commander'
import { MigrationService } from './src/app/api/services/MigrationService.js'
import { createUmzugInstance } from './src/migrations/umzug.js'

const program = new Command()

program
  .name('migration-cli')
  .description('CLI for managing migrations with Umzug')
  .version('1.0.0')

program
  .command('status')
  .description('Show migration status')
  .action(async () => {
    try {
      const appInfo = await MigrationService.getAppInfo()
      const service = new MigrationService(appInfo)
      const umzug = createUmzugInstance(service)

      console.log('📋 Migration Status')
      console.log('==================')
      console.log(`Current version: ${appInfo.version}`)
      console.log(`Previous version: ${appInfo.previousVersion}`)
      console.log()

      const executed = await umzug.executed()
      const pending = await umzug.pending()

      console.log(`✅ Executed migrations (${executed.length}):`)
      if (executed.length === 0) {
        console.log('  (none)')
      } else {
        executed.forEach((migration, index) => {
          console.log(`  ${index + 1}. ${migration.name}`)
        })
      }
      console.log()

      console.log(`⏳ Pending migrations (${pending.length}):`)
      if (pending.length === 0) {
        console.log('  (none)')
      } else {
        pending.forEach((migration, index) => {
          console.log(`  ${index + 1}. ${migration.name}`)
        })
      }
    } catch (error) {
      console.error('❌ Error:', error)
      process.exit(1)
    }
  })

program
  .command('up')
  .description('Run pending migrations')
  .action(async () => {
    try {
      const appInfo = await MigrationService.getAppInfo()
      const service = new MigrationService(appInfo)
      const umzug = createUmzugInstance(service)

      const pending = await umzug.pending()
      if (pending.length === 0) {
        console.log('✅ No pending migrations')
        return
      }

      console.log(`🚀 Running ${pending.length} migration(s)...`)
      const executed = await umzug.up()

      console.log('✅ Successfully executed migrations:')
      executed.forEach((migration) => {
        console.log(`  ✓ ${migration.name}`)
      })
    } catch (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  })

program
  .command('down')
  .description('Rollback the last migration')
  .action(async () => {
    try {
      const appInfo = await MigrationService.getAppInfo()
      const service = new MigrationService(appInfo)
      const umzug = createUmzugInstance(service)

      console.log('🔄 Rolling back last migration...')
      const executed = await umzug.down()

      if (executed.length === 0) {
        console.log('✅ No migrations to rollback')
      } else {
        console.log('✅ Successfully rolled back:')
        executed.forEach((migration) => {
          console.log(`  ✓ ${migration.name}`)
        })
      }
    } catch (error) {
      console.error('❌ Rollback failed:', error)
      process.exit(1)
    }
  })

program
  .command('create <name>')
  .description('Create a new migration file')
  .action(async (name: string) => {
    try {
      const fs = await import('node:fs')
      const path = await import('node:path')

      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .split('.')[0] // YYYYMMDDTHHMMSS
      const filename = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}.ts`
      const migrationPath = path.join(
        process.cwd(),
        'src/migrations/files',
        filename,
      )

      const template = `import type { MigrationContext } from '../umzug'

export async function up({ service }: MigrationContext) {
  console.log('Running migration: ${name}')
  // TODO: Implement migration logic here
}

export async function down({ service }: MigrationContext) {
  console.log('Rolling back migration: ${name}')
  // TODO: Implement rollback logic here
}
`

      fs.writeFileSync(migrationPath, template)
      console.log(`✅ Created migration: ${filename}`)
      console.log(`📁 Location: ${migrationPath}`)
    } catch (error) {
      console.error('❌ Failed to create migration:', error)
      process.exit(1)
    }
  })

program.parse(process.argv)
