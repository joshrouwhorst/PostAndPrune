#!/usr/bin/env node

// Simple migration CLI for Docker environment
// This is an ES module version that works with the package.json type: "module"

import { Command } from 'commander'
import { createUmzugInstance } from './src/migrations/umzug.js'
import fs from 'node:fs'
import path from 'node:path'

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
      const umzug = createUmzugInstance()

      console.log('📋 Migration Status')
      console.log('==================')
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
      const umzug = createUmzugInstance()

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
      const umzug = createUmzugInstance()

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
  .action(async (name) => {
    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .split('.')[0] // YYYYMMDDTHHMMSS
      const filename = `${timestamp}_${name
        .toLowerCase()
        .replace(/\s+/g, '_')}.ts`
      const migrationPath = path.join(
        process.cwd(),
        'src/migrations/files',
        filename
      )

      const template = `import type { MigrationContext } from '../umzug.js'

export async function up(context: MigrationContext) {
  console.log('Running migration: ${name}')
  // TODO: Implement migration logic here
}

export async function down(context: MigrationContext) {
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
