import { NextRequest, NextResponse } from 'next/server';
import { UserRepository } from '@/db/repositories/UserRepository';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const user = await UserRepository.findById(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Fetch user error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
