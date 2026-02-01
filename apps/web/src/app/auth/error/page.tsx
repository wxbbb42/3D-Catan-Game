'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'Access was denied. You may not have permission to sign in.',
    Verification: 'The verification link may have expired or already been used.',
    OAuthSignin: 'Error starting the OAuth sign-in process.',
    OAuthCallback: 'Error during the OAuth callback.',
    OAuthCreateAccount: 'Could not create an account with this OAuth provider.',
    EmailCreateAccount: 'Could not create an account with this email.',
    Callback: 'Error during the authentication callback.',
    OAuthAccountNotLinked: 'This email is already associated with another account.',
    EmailSignin: 'Error sending the sign-in email.',
    CredentialsSignin: 'Sign in failed. Check the details you provided.',
    SessionRequired: 'Please sign in to access this page.',
    Default: 'An unexpected error occurred.',
  }

  const message = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-light via-ui-bg to-terrain-pasture/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 text-center">
          {/* Error Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-ui-text mb-2">Authentication Error</h1>

          {/* Message */}
          <p className="text-ui-text-muted mb-6">{message}</p>

          {/* Error Code */}
          {error && (
            <p className="text-xs text-ui-text-muted mb-6 font-mono bg-gray-100 px-3 py-1 rounded inline-block">
              Error code: {error}
            </p>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full py-3 px-4 bg-ui-accent hover:bg-blue-500 text-white font-semibold rounded-xl transition-all"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="block w-full py-3 px-4 bg-white hover:bg-gray-50 border border-ui-border text-ui-text font-medium rounded-xl transition-all"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-light via-ui-bg to-terrain-pasture/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-6 bg-gray-200 rounded mb-2 w-1/2 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ErrorContent />
    </Suspense>
  )
}
