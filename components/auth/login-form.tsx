"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginFormProps = {
  redirectTo?: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const info = redirectTo ? "Нэвтэрч байж үргэлжлүүлнэ" : null;

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Нэвтрэх боломжгүй");
      router.push(redirectTo || "/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="rounded-3xl bg-white/90 backdrop-blur-sm p-8 shadow-2xl shadow-indigo-200/50 ring-1 ring-slate-200/50">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Нэвтрэх</h1>
          <p className="mt-2 text-sm text-slate-600">Өрхийн төсвийн самбар</p>
        </div>
        {info && (
          <div className="mb-4 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700 border border-indigo-100">
            <span className="mr-2">ℹ️</span>
            {info}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 border border-rose-100">
            <span className="mr-2">⚠️</span>
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Имэйл</label>
            <input
              autoComplete="email"
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="family@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Нууц үг</label>
            <input
              autoComplete="current-password"
              type="password"
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Уншиж байна..." : "Нэвтрэх →"}
          </button>
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">
          Бүртгэлгүй юу?{" "}
          <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition">
            Бүртгүүлэх
          </a>
        </p>
      </div>
    </div>
  );
}
