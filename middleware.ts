import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { logoutAllAccounts } from './src/app/api-helpers/auth/AuthManager'

/**
 * Middleware to automatically logout from Bluesky after API calls
 * This runs for all /api routes that match the config below
 */
export async function middleware(request: NextRequest, event: NextFetchEvent) {
  // Only run for specific API routes that use Bluesky
  const shouldLogout = shouldAutoLogout(request.nextUrl.pathname)

  if (!shouldLogout) {
    return NextResponse.next()
  }

  // Continue with the request
  const response = await NextResponse.next()

  // Schedule logout after the response (non-blocking)
  event.waitUntil(performLogout())

  return response
}

/**
 * Determine if this route should trigger automatic logout
 */
function shouldAutoLogout(pathname: string): boolean {
  const logoutRoutes = [
    '/api/backup',
    '/api/schedules/posts',
    '/api/drafts', // when publishing
    // Add other routes that use Bluesky here
  ]

  return logoutRoutes.some((route) => pathname.startsWith(route))
}

/**
 * Perform the logout operation
 */
async function performLogout() {
  try {
    // Dynamically import to avoid circular dependencies
    await logoutAllAccounts()
    console.log('Bluesky logout completed via middleware')
  } catch (error) {
    console.error('Failed to logout from Bluesky via middleware:', error)
  }
}

export const config = {
  matcher: [
    '/api/backup/:path*',
    '/api/schedules/posts/:path*',
    '/api/drafts/:path*',
    // Add other API routes that need automatic logout
  ],
}
