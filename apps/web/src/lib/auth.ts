import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'

// For development, we also allow a simple credentials provider
// In production, you'd want to remove this or add proper validation

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    }),
    // Development-only credentials provider for testing without OAuth setup
    CredentialsProvider({
      name: 'Guest',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'Enter a username' },
      },
      async authorize(credentials) {
        if (!credentials?.username) {
          return null
        }

        // Create a guest user
        return {
          id: `guest-${Date.now()}`,
          name: credentials.username,
          email: `${credentials.username.toLowerCase().replace(/\s+/g, '')}@guest.local`,
          image: null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.provider = account?.provider
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.provider = token.provider as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      provider?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    provider?: string
  }
}
