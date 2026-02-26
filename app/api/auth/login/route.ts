import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { comparePassword } from '@/lib/auth';
import { signSession } from '@/lib/token';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email болон нууц үг шаардлагатай' }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection<{ _id: string; email: string; password: string }>('users');
    const user = await users.findOne({ email });

    if (!user || !comparePassword(password, user.password)) {
      return NextResponse.json({ error: 'Нэвтрэх мэдээлэл буруу' }, { status: 401 });
    }

    const token = await signSession({ userId: String(user._id), email: user.email });

    const res = NextResponse.json({ ok: true });
    res.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json(
      { error: 'Серверийн алдаа. Дараа дахин оролдоно уу.' },
      { status: 500 }
    );
  }
}
