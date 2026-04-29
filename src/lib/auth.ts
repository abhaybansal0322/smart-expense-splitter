import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { query } from './db';
import { getServerSession } from 'next-auth/next';

interface AuthUserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
}

interface UserIdRow {
  id: string;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
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

        const email = credentials.email.trim().toLowerCase();
        const res = await query<AuthUserRow>(
          'SELECT id, name, email, password_hash FROM users WHERE email = $1',
          [email]
        );

        const user = res.rows[0];

        if (!user || !user.password_hash) {
          throw new Error('User not found or using another login method');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
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
        // Check if user exists (case-insensitive)
        const res = await query<UserIdRow>('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
        
        if (res.rowCount === 0) {
          // Store new Google user in PostgreSQL
          await query(
            'INSERT INTO users (name, email) VALUES ($1, $2)',
            [user.name || 'Google User', normalizedEmail]
          );
        }
        return true;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === 'google') {
          // Fetch the database user ID if it's a google login (case-insensitive)
          const email = user.email?.trim().toLowerCase();
          if (!email) return token;

          const dbUserRes = await query<UserIdRow>('SELECT id FROM users WHERE email = $1', [email]);
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
