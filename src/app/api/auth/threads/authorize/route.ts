import { generateAuthURL } from '@/app/api-helpers/auth/ThreadsAuth'
import Logger from '@/app/api-helpers/logger'
import { validateThreadsConfig } from '@/config/main'
import { generateOAuthState } from '@/helpers/threads'
import { NextResponse } from 'next/server'

const logger = new Logger('ThreadsOAuth')

/**
 * Initiate Threads OAuth authorization flow
 * GET /api/auth/threads/authorize
 */
export async function GET(request: Request) {
  try {
    // Validate Threads configuration
    const validation = validateThreadsConfig()
    if (!validation.isValid) {
      logger.error('Threads configuration invalid:', validation.errors)
      return NextResponse.json(
        {
          error:
            'Threads integration not configured. Please check your environment variables.',
          details: validation.errors,
          hint: 'Make sure THREADS_APP_ID, THREADS_APP_SECRET, and THREADS_REDIRECT_URI are set in your .env.local file.',
        },
        { status: 500 },
      )
    }

    // Generate state parameter for CSRF protection
    const state = generateOAuthState()

    // Generate authorization URL
    const authUrl = generateAuthURL(state)

    logger.log('Generated Threads authorization URL')

    // Return the authorization URL and state
    // The frontend will redirect to this URL and store the state for verification
    return NextResponse.json({
      authUrl,
      state,
    })
  } catch (error) {
    logger.error('Failed to generate authorization URL:', error)
    return NextResponse.json(
      {
        error: 'Failed to initiate OAuth flow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
