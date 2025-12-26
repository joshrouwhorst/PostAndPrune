import {
  exchangeCodeForTokens,
  getAccountInfo,
} from '@/app/api-helpers/auth/ThreadsAuth'
import Logger from '@/app/api-helpers/logger'
import CredentialService from '@/app/api/services/CredentialService'
import generateId from '@/helpers/generateId'
import { calculateTokenExpiry } from '@/helpers/threads'
import type { Account, Credentials } from '@/types/accounts'
import { NextResponse } from 'next/server'

const logger = new Logger('ThreadsCallback')

/**
 * Handle Threads OAuth callback
 * GET /api/auth/threads/callback
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      logger.error('OAuth callback error:', { error, errorDescription })

      // Redirect to settings page with error
      const redirectUrl = new URL('/settings', url.origin)
      redirectUrl.searchParams.set('error', error)
      if (errorDescription) {
        redirectUrl.searchParams.set('error_description', errorDescription)
      }

      return NextResponse.redirect(redirectUrl)
    }

    // Validate required parameters
    if (!code) {
      logger.error('No authorization code received')
      const redirectUrl = new URL('/settings', url.origin)
      redirectUrl.searchParams.set('error', 'missing_code')
      redirectUrl.searchParams.set(
        'error_description',
        'No authorization code received',
      )
      return NextResponse.redirect(redirectUrl)
    }

    if (!state) {
      logger.error('No state parameter received')
      const redirectUrl = new URL('/settings', url.origin)
      redirectUrl.searchParams.set('error', 'missing_state')
      redirectUrl.searchParams.set(
        'error_description',
        'Missing state parameter',
      )
      return NextResponse.redirect(redirectUrl)
    }

    // TODO: Validate state parameter against stored value
    // This would require session/cookie storage of the state

    // Exchange authorization code for tokens
    logger.log('Exchanging authorization code for tokens')
    const tokens = await exchangeCodeForTokens(code, state)

    // Create temporary account to get profile info
    const tempAccount: Account = {
      id: 'temp',
      name: 'Temporary',
      platform: 'threads',
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: calculateTokenExpiry(tokens.expires_in),
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      profile: null,
    }

    // Get user profile information
    logger.log('Fetching user profile information')
    const profile = await getAccountInfo(tempAccount)

    // Create the account
    const account: Account = {
      id: generateId(),
      name: profile.displayName || profile.username || 'Threads Account',
      platform: 'threads',
      isActive: true,
      createdAt: new Date().toISOString(),
      profile,
    }

    // Store credentials securely
    const credentials: Credentials = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: calculateTokenExpiry(tokens.expires_in),
      appId: process.env.THREADS_APP_ID,
      scopes: tokens.scope.split(','),
    }

    await CredentialService.setCredentials(account, credentials)

    logger.log(
      `Successfully created Threads account: ${account.name} (${profile.username})`,
    )

    // Redirect to settings page with success message
    const redirectUrl = new URL('/settings', url.origin)
    redirectUrl.searchParams.set('success', 'threads_connected')
    redirectUrl.searchParams.set('account_name', account.name)
    redirectUrl.searchParams.set('username', profile.username || '')

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    logger.error('OAuth callback failed:', error)

    const url = new URL(request.url)
    const redirectUrl = new URL('/settings', url.origin)
    redirectUrl.searchParams.set('error', 'callback_failed')
    redirectUrl.searchParams.set(
      'error_description',
      error instanceof Error ? error.message : 'Unknown error',
    )

    return NextResponse.redirect(redirectUrl)
  }
}
