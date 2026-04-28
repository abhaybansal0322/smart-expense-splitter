import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { query } from './db';
import { User } from './types';
import { getServerSession } from 'next-auth/next';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login', // Optional: customize the login page
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

        const res = await query<any>(
          'SELECT id, name, email, password FROM users WHERE email = $1',
          [credentials.email]
        );

        const user = res.rows[0];

        if (!user || !user.password) {
          throw new Error('User not found or using another login method');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
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
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = user.email;
        if (!email) return false;

        // Check if user exists
        const res = await query<any>('SELECT id FROM users WHERE email = $1', [email]);
        
        if (res.rowCount === 0) {
          // Store new Google user in PostgreSQL
          await query(
            'INSERT INTO users (name, email) VALUES ($1, $2)',
            [user.name || 'Google User', email]
          );
        }
        return true;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === 'google') {
          // Fetch the database user ID if it's a google login
          const dbUserRes = await query<any>('SELECT id FROM users WHERE email = $1', [user.email]);
          if (dbUserRes.rowCount > 0) {
            token.id = dbUserRes.rows[0].id;
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
