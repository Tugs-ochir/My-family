"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info] = useState(() =>
    search.get("from") ? "Нэвтэрч байж үргэлжлүүлнэ" : null,
  );

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Нэвтрэх боломжгүй");
      router.push(search.get("from") || "/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <div className="w-full max-width-sm max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Нэвтрэх</h1>
        <p className="mt-1 text-sm text-slate-600">Өрхийн төсвийн самбар</p>
        {info && (
          <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
            {info}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
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
              autoComplete="current-password"
              type="password"
              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white shadow"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Уншиж байна..." : "Нэвтрэх"}
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-600">
          Анхны хэрэглэгч байхгүй бол <a href="/register" className="text-indigo-600 underline">бүртгүүлэх</a>.
        </p>
      </div>
    </main>
  );
}
