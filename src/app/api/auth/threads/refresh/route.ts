import { withSocialLogoutForRequest } from '@/app/api-helpers/apiWrapper'
import { refreshAccessToken } from '@/app/api-helpers/auth/ThreadsAuth'
import Logger from '@/app/api-helpers/logger'
import { getAccounts } from '@/app/api/services/SettingsService'
import { NextRequest, NextResponse } from 'next/server'

const logger = new Logger('ThreadsRefresh')

/**
 * Refresh Threads access token
 * POST /api/auth/threads/refresh
 */
export const POST = withSocialLogoutForRequest(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      )
    }

    // Find the account
    const accounts = await getAccounts()
    const account = accounts.find(
      (a) => a.id === accountId && a.platform === 'threads',
    )

    if (!account) {
      return NextResponse.json(
        { error: 'Threads account not found' },
        { status: 404 },
      )
    }

    // Refresh the token
    logger.log(`Refreshing token for account: ${account.name}`)
    const newTokens = await refreshAccessToken(account)

    return NextResponse.json({
      success: true,
      expiresAt: new Date(
        Date.now() + newTokens.expires_in * 1000,
      ).toISOString(),
    })
  } catch (error) {
    logger.error('Failed to refresh token:', error)
    return NextResponse.json(
      {
        error: 'Failed to refresh token',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
})
