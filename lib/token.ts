import { SignJWT, jwtVerify } from 'jose';

// Use env secret when provided; fall back to a dev-safe default to avoid crash.
// In production, set AUTH_SECRET in .env.local.
const rawSecret = process.env.AUTH_SECRET || 'dev-secret-change-me';
const secretKey = new TextEncoder().encode(rawSecret);

export type SessionToken = {
  userId: string;
  email: string;
};

export async function signSession(payload: SessionToken) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifySession(token: string): Promise<SessionToken | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return { userId: String(payload.userId), email: String(payload.email) };
  } catch (err) {
    return null;
  }
}
