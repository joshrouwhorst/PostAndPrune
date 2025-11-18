import { withSocialLogoutForRequest } from '@/app/api-helpers/apiWrapper'
import { NextResponse } from 'next/server'

import type { Account } from '@/types/accounts'

export const POST = withSocialLogoutForRequest(async (request: Request) => {
  try {
    const account: Account = await request.json()

    // Basic validation
    if (!account.platform || !account.name || !account.credentials) {
      return NextResponse.json(
        { valid: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // TODO: Additional validation logic can be added here (e.g., check credentials format)

    return NextResponse.json({ valid: true }, { status: 200 })
  } catch (error) {
    console.error('Error validating account:', error)
    return NextResponse.json(
      { valid: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }
})
