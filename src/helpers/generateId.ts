import { randomBytes, randomUUID } from 'node:crypto'

/**
 * Generate a short, collision-resistant unique id.
 * Uses crypto.randomUUID when available, otherwise falls back to
 * a timestamp + random hex payload.
 */
export default function generateId(): string {
  if (typeof randomUUID === 'function') {
    return randomUUID()
  }

  // Fallback: timestamp (base36) + 12 random bytes (hex) => compact & unique
  const hex = randomBytes(12).toString('hex')
  return `${Date.now().toString(36)}-${hex}`
}
