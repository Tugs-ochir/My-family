'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleRegister() {
    setError(null);
    setSuccess(null);
    if (!email || !password) {
      setError('Имэйл, нууц үг оруулна уу');
      return;
    }
    if (password !== confirm) {
      setError('Нууц үг таарахгүй байна');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Бүртгэж чадсангүй');
      setSuccess('Амжилттай бүртгэгдлээ. Одоо нэвтэрнэ үү.');
      setTimeout(() => router.push('/login'), 800);
    } catch (err: any) {
      setError(err.message || 'Алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
      <h1 className="text-2xl font-bold text-slate-900">Бүртгүүлэх</h1>
      <p className="mt-1 text-sm text-slate-600">Өрхийн төсвийн самбар</p>
      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      )}
      {success && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</p>
      )}
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-sm text-slate-700">Имэйл</label>
          <input
            autoComplete="email"
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="family@example.com"
          />
        </div>
        <div>
          <label className="text-sm text-slate-700">Нууц үг</label>
          <input
            autoComplete="new-password"
            type="password"
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="text-sm text-slate-700">Нууц үг давтах</label>
          <input
            autoComplete="new-password"
            type="password"
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <button
          type="button"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white shadow"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? 'Уншиж байна...' : 'Бүртгүүлэх'}
        </button>
        <p className="text-xs text-slate-600">
          Аль хэдийн бүртгэлтэй юу? <a href="/login" className="text-indigo-600 underline">Нэвтрэх</a>
        </p>
      </div>
    </div>
  );
}
