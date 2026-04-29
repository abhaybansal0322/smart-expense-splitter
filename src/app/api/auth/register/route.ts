import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [emailLower]);
    if (existingUser.rowCount > 0) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)',
      [name, emailLower, hashedPassword]
    );

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
