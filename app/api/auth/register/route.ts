import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email болон нууц үг хэрэгтэй' }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });

    const hashed = hashPassword(password);
    const result = await users.insertOne({ email, password: hashed, createdAt: new Date() });

    return NextResponse.json({ userId: result.insertedId, email }, { status: 201 });
  } catch (err: any) {
    // Surface duplicate email violations and unexpected server issues.
    if (err?.code === 11000) {
      return NextResponse.json({ error: 'Энэ имэйл бүртгэлтэй байна' }, { status: 400 });
    }

    console.error('Register API error:', err);
    return NextResponse.json(
      { error: 'Серверийн алдаа. Дараа дахин оролдоно уу.' },
      { status: 500 }
    );
  }
}
