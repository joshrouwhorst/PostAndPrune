'use client'

import { useEffect, useState } from 'react'

export default function ThreadsOAuthCallbackPage() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing',
  )
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const state = urlParams.get('state')
        const error = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')

        if (error) {
          throw new Error(errorDescription || error)
        }

        if (!code) {
          throw new Error('No authorization code received')
        }

        setMessage('Exchanging authorization code for tokens...')

        // Exchange code for tokens
        const response = await fetch('/api/auth/threads/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to complete OAuth flow')
        }

        const tokenData = await response.json()

        setStatus('success')
        setMessage('Successfully connected to Threads!')

        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'THREADS_OAUTH_SUCCESS',
              accessToken: tokenData.accessToken,
              refreshToken: tokenData.refreshToken,
              expiresAt: tokenData.expiresAt,
            },
            window.location.origin,
          )
        }

        // Close popup after delay
        setTimeout(() => {
          window.close()
        }, 2000)
      } catch (error) {
        setStatus('error')
        setMessage(
          error instanceof Error ? error.message : 'Unknown error occurred',
        )

        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'THREADS_OAUTH_ERROR',
              error:
                error instanceof Error
                  ? error.message
                  : 'Unknown error occurred',
            },
            window.location.origin,
          )
        }

        // Close popup after delay
        setTimeout(() => {
          window.close()
        }, 3000)
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h2 className="text-lg font-semibold mb-2">
                Connecting to Threads
              </h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-green-800 mb-2">
                Success!
              </h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-2">
                This window will close automatically.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                Connection Failed
              </h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-2">
                This window will close automatically.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
