import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { logout as bskyLogout } from './auth/BlueskyAuth'
import Logger from './logger'

const logger = new Logger('ApiWrapper')

/**
 * Wraps API route handlers to automatically logout from Bluesky after each call
 * For handlers that don't need request parameter
 *
 * Usage:
 * export const GET = withBskyLogout(async () => {
 *   // your API logic here
 *   return NextResponse.json({ data: 'something' })
 * })
 */
export function withBskyLogout(handler: () => Promise<NextResponse>) {
  return async () => {
    try {
      logger.log('API call started')
      const response = await handler()
      logger.log('API call completed successfully')
      return response
    } catch (error) {
      logger.error('API call failed:', error)
      throw error // Re-throw to maintain error handling
    } finally {
      try {
        await bskyLogout()
        logger.log('Bluesky logout completed')
      } catch (logoutError) {
        logger.error('Failed to logout from Bluesky:', logoutError)
        // Don't throw here - we don't want logout errors to affect the main response
      }
    }
  }
}

/**
 * Wraps API route handlers with request parameter to automatically logout from Bluesky after each call
 *
 * Usage:
 * export const POST = withBskyLogoutForRequest(async (request: NextRequest) => {
 *   // your API logic here
 *   return NextResponse.json({ data: 'something' })
 * })
 */
export function withBskyLogoutForRequest(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      logger.log('API call started')
      const response = await handler(request)
      logger.log('API call completed successfully')
      return response
    } catch (error) {
      logger.error('API call failed:', error)
      throw error // Re-throw to maintain error handling
    } finally {
      try {
        await bskyLogout()
        logger.log('Bluesky logout completed')
      } catch (logoutError) {
        logger.error('Failed to logout from Bluesky:', logoutError)
        // Don't throw here - we don't want logout errors to affect the main response
      }
    }
  }
}

/**
 * Wrapper that catches errors and returns error responses (no request parameter)
 * Use this if you want consistent error handling across all routes
 */
export function withBskyLogoutAndErrorHandling(
  handler: () => Promise<NextResponse>
) {
  return async () => {
    try {
      logger.log('API call started')
      const response = await handler()
      logger.log('API call completed successfully')
      return response
    } catch (error) {
      logger.error('API call failed:', error)

      // Return consistent error response
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    } finally {
      try {
        await bskyLogout()
        logger.log('Bluesky logout completed')
      } catch (logoutError) {
        logger.error('Failed to logout from Bluesky:', logoutError)
      }
    }
  }
}

/**
 * Wrapper that catches errors and returns error responses (with request parameter)
 * Use this if you want consistent error handling across all routes
 */
export function withBskyLogoutAndErrorHandlingForRequest(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      logger.log('API call started')
      const response = await handler(request)
      logger.log('API call completed successfully')
      return response
    } catch (error) {
      logger.error('API call failed:', error)

      // Return consistent error response
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    } finally {
      try {
        await bskyLogout()
        logger.log('Bluesky logout completed')
      } catch (logoutError) {
        logger.error('Failed to logout from Bluesky:', logoutError)
      }
    }
  }
}

export function withBskyLogoutWithId(
  handler: (id: string, request: NextRequest) => Promise<Response>
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<{ id?: string }> }
  ) => {
    const { id } = await params

    try {
      if (!id) {
        logger.error('ID parameter is missing')
        return NextResponse.json(
          { error: 'ID parameter is required' },
          { status: 400 }
        )
      }

      logger.log('API call started')
      const response = await handler(id, request)
      logger.log('API call completed successfully')
      return response
    } catch (error) {
      logger.error('API call failed:', error)

      // Return consistent error response
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    } finally {
      try {
        await bskyLogout()
        logger.log('Bluesky logout completed')
      } catch (logoutError) {
        logger.error('Failed to logout from Bluesky:', logoutError)
      }
    }
  }
}
