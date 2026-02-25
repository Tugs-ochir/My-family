import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { verifySession } from './token';

export function hashPassword(password: string) {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('session')?.value;
  
  if (!token) {
    return null;
  }
  
  return await verifySession(token);
}
