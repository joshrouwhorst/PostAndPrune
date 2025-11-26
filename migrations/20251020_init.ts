async function up(service) {
  // Example migration: Add a new field to app metadata
  if (service.isPreviousVersionLessThan('0.1.1')) {
    console.log('Migrating to 0.1.1: <description>')
  }
}

async function down(service) {
  // Example rollback: Remove the new field from app metadata
  if (service.isPreviousVersionGreaterThan('0.1.0')) {
    console.log('Reverting migration to 0.1.0: <description>')
  }
}

export {
  down, up
}

