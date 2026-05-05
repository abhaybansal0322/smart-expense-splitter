import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { UserRepository } from '@/db/repositories/UserRepository';
import { getServerSession } from 'next-auth/next';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const email = credentials.email.trim().toLowerCase();
        const user = await UserRepository.findByEmail(email);

        if (!user || !user.passwordHash) {
          throw new Error('User not found or using another login method');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email;
        if (!email) return false;

        const normalizedEmail = email.trim().toLowerCase();
        const existing = await UserRepository.findByEmail(normalizedEmail);
        
        if (!existing) {
          await UserRepository.create({
            name: user.name || 'Google User',
            email: normalizedEmail,
            avatarUrl: user.image || null
          });
        }
        return true;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === 'google') {
          const email = user.email?.trim().toLowerCase();
          if (!email) return token;

          const dbUser = await UserRepository.findByEmail(email);
          if (dbUser) {
            token.id = dbUser.id;
          }
        } else {
          token.id = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

/**
 * Helper function to get the current server session
 */
export async function getAuthSession() {
  return getServerSession(authOptions);
}
