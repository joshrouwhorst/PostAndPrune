# Umzug Migration System Migration Guide

## Overview

This document explains the migration from the custom migration system to Umzug, a robust database migration library that provides better reliability, error handling, and features.

## What Changed

### Migration System Architecture
- **Before**: Custom migration system using `.migrations.json` and manual file tracking
- **After**: Umzug-based system with JSON storage adapter and proper migration state management

### Key Files Removed/Deprecated
- `migrations/` directory (old system)
- Custom migration tracking logic in `start.ts`

### Key Files Added
- `src/migrations/umzug.ts` - Umzug configuration and setup
- `src/migrations/index.ts` - Migration system exports and utilities
- `src/migrations/files/` - New location for migration files
- `migration-cli.ts` - Command-line interface for migration management

### Files Modified
- `start.ts` - Simplified to use Umzug instead of custom system
- `src/app/api/services/MigrationService.ts` - Updated for Umzug compatibility
- `package.json` - Added migration CLI scripts

## Features

### Umzug Benefits
1. **Robust Error Handling**: Automatic rollback on migration failures
2. **Migration State Tracking**: Reliable tracking in `.migrations.json`
3. **CLI Tools**: Built-in commands for migration management
4. **Version Control**: Better handling of migration ordering and dependencies
5. **Logging**: Comprehensive logging of migration execution

### Migration CLI Commands
```bash
# Check migration status
npm run migration:status

# Run pending migrations
npm run migration:up

# Rollback last migration
npm run migration:down

# Create new migration
npm run migration:create "migration name"
```

### Docker Compatibility
- Fixed ESM module resolution with explicit `.js` extensions
- Relative imports instead of TypeScript path aliases
- Compatible with Node.js ESM in containerized environments

## Migration File Structure

```typescript
import type { MigrationContext } from '../umzug.js'

export async function up({ service }: MigrationContext) {
  console.log('Running migration: Migration Name')
  // Migration logic here
  const appData = await service.getAppData()
  // Modify appData as needed
  await service.saveAppData(appData)
}

export async function down({ service }: MigrationContext) {
  console.log('Rolling back migration: Migration Name')
  // Rollback logic here
}
```

## Storage System

### Migration State Storage
- **File**: `.migrations.json`
- **Format**: JSON with migration list and timestamps
- **Location**: Project root

### App Version Tracking
- **File**: `.app-version.json`
- **Purpose**: Track version changes to trigger migrations
- **Location**: Project root

## Usage Examples

### Running Migrations on Startup
Migrations are automatically executed when running `start.ts`:
```bash
node start.js  # In production
npx tsx start.ts  # In development
```

### Manual Migration Management
```bash
# Check what migrations are pending
npm run migration:status

# Run all pending migrations
npm run migration:up

# Create a new migration
npm run migration:create "add user preferences"
```

### Programmatic Usage
```typescript
import { runPendingMigrations } from './src/migrations/index.js'

await runPendingMigrations()
```

## Backward Compatibility

The system maintains backward compatibility:
- Existing migration files are preserved and work with Umzug
- Previous migration state is automatically detected and preserved
- No manual intervention required for existing deployments

## Error Handling

1. **Migration Failures**: Umzug stops execution and provides detailed error information
2. **File Not Found**: Clear error messages for missing migration files
3. **Module Resolution**: Explicit error handling for import failures
4. **Storage Issues**: Graceful handling of JSON file read/write errors

## Testing

The system has been tested for:
- ✅ Local development with TypeScript
- ✅ Production builds with Next.js
- ✅ Docker containerized environments
- ✅ Migration rollback functionality
- ✅ CLI command interface

## Future Enhancements

Umzug provides a foundation for future improvements:
- Database-backed migration storage
- Migration dependencies and ordering
- Parallel migration execution
- Migration hooks and callbacks
- Advanced rollback strategies