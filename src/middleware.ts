import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  // Protect all API routes except /api/auth
  matcher: ['/api/((?!auth).*)'],
};
