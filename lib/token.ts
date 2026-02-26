import { SignJWT, jwtVerify } from 'jose';

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) {
  throw new Error('JWT_SECRET environment variable is not set');
}
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
