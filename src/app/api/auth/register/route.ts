import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserRepository } from '@/db/repositories/UserRepository';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    const existingUser = await UserRepository.findByEmail(emailLower);
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await UserRepository.create({
      name,
      email: emailLower,
      passwordHash: hashedPassword
    });

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
