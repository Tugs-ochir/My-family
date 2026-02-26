import { SignJWT, jwtVerify } from 'jose';

export type SessionToken = {
  userId: string;
  email: string;
};

function getSecretKey(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw) throw new Error('JWT_SECRET environment variable is not set');
  return new TextEncoder().encode(raw);
}

export async function signSession(payload: SessionToken) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionToken | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return { userId: String(payload.userId), email: String(payload.email) };
  } catch {
    return null;
  }
}
