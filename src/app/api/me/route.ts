import { NextResponse } from 'next/server';
import { UserRepository } from '@/db/repositories/UserRepository';
import { withAuth } from '@/lib/apiHandler';

export const GET = withAuth(async ({ userId }) => {
  const user = await UserRepository.findById(userId);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ 
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
}, 'GET /api/me');
