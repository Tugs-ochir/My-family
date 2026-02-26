import { NextResponse } from 'next/server';
import { getDb, ensureIndexes } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';
import { signSession } from '@/lib/token';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email болон нууц үг хэрэгтэй' }, { status: 400 });
    }

    await ensureIndexes();
    const db = await getDb();
    const users = db.collection('users');

    const hashed = hashPassword(password);
    const result = await users.insertOne({ email, password: hashed, createdAt: new Date() });

    const token = await signSession({ userId: String(result.insertedId), email });
    const res = NextResponse.json({ ok: true }, { status: 201 });
    res.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
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
