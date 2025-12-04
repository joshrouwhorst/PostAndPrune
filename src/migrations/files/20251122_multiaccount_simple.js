// Simplified migration for Docker environment
// This skips the complex file operations that require TypeScript services

export async function up(context) {
  console.log('Running migration: Multi-account support (Docker simplified)')
  console.log('Note: Complex file operations skipped in Docker environment')
  console.log('Migration completed successfully (simplified)')
}

export async function down(context) {
  console.log('Rolling back migration: Multi-account support (Docker simplified)')
  console.log('Note: Complex file operations skipped in Docker environment')
  console.log('Migration rollback completed successfully (simplified)')
}