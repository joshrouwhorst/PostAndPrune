import { withSocialLogoutForRequest } from '@/app/api-helpers/apiWrapper'
import { logout } from '@/app/api-helpers/auth/ThreadsAuth'
import Logger from '@/app/api-helpers/logger'
import CredentialService from '@/app/api/services/CredentialService'
import { getAccounts } from '@/app/api/services/SettingsService'
import { NextRequest, NextResponse } from 'next/server'

const logger = new Logger('ThreadsRevoke')

/**
 * Revoke Threads access token and logout
 * DELETE /api/auth/threads/revoke
 */
export const DELETE = withSocialLogoutForRequest(
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url)
      const accountId = url.searchParams.get('accountId')

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

      // Logout from Threads (clears local token cache)
      await logout(account)

      // Remove credentials from storage
      await CredentialService.removeCredentials(account)

      logger.log(`Successfully revoked tokens for account: ${account.name}`)

      return NextResponse.json({
        success: true,
        message: 'Account disconnected successfully',
      })
    } catch (error) {
      logger.error('Failed to revoke token:', error)
      return NextResponse.json(
        {
          error: 'Failed to disconnect account',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      )
    }
  },
)
