'use client';

import { useEffect, useMemo, useState } from 'react';

type Expense = { id: string; label: string; amount: number; recurring?: boolean; paid?: boolean };
type Goal = {
  id: string;
  title: string;
  target: number;
  due: string;
  done: boolean;
  recurring?: boolean;
  saved?: number; // planned/saved amount for the month
};
type Loan = {
  id: string;
  title: string;
  amount: number;
  due: string;
  paid?: boolean;
  recurring?: boolean;
  monthlyPayment?: number;
};

export default function Home() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [husbandIncome, setHusbandIncome] = useState(0);
  const [wifeIncome, setWifeIncome] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: crypto.randomUUID(), label: 'Хоол', amount: 0, recurring: true, paid: false },
  ]);
  const [goals, setGoals] = useState<Goal[]>([
    { id: crypto.randomUUID(), title: 'Хуримтлал', target: 0, due: '', done: false, recurring: true, saved: 0 },
  ]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const incomeTotal = useMemo(() => husbandIncome + wifeIncome, [husbandIncome, wifeIncome]);
  const expenseTotal = useMemo(() => expenses.reduce((sum, e) => sum + (e.amount || 0), 0), [expenses]);
  const expensePaidTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + (e.paid ? e.amount || 0 : 0), 0),
    [expenses],
  );
  const expenseRemaining = useMemo(() => Math.max(expenseTotal - expensePaidTotal, 0), [expenseTotal, expensePaidTotal]);
  const goalsPlanned = useMemo(() => goals.reduce((sum, g) => sum + (g.saved || 0), 0), [goals]);
  const goalsOverdueCount = useMemo(
    () => goals.filter((g) => g.due && !g.done && new Date(g.due) < new Date()).length,
    [goals],
  );
  const loanTotal = useMemo(() => loans.reduce((sum, l) => sum + (l.amount || 0), 0), [loans]);
  const loanPaidTotal = useMemo(
    () => loans.reduce((sum, l) => sum + (l.paid ? l.amount || 0 : 0), 0),
    [loans],
  );
  const loanRemaining = useMemo(() => Math.max(loanTotal - loanPaidTotal, 0), [loanTotal, loanPaidTotal]);
  const loanMonthlyTotal = useMemo(() => loans.reduce((sum, l) => sum + (l.monthlyPayment || 0), 0), [loans]);
  const netAfterExpenses = useMemo(() => incomeTotal - expenseTotal, [incomeTotal, expenseTotal]);
  const freeCash = useMemo(() => netAfterExpenses - goalsPlanned, [netAfterExpenses, goalsPlanned]);
  const recurringForecast = useMemo(
    () => expenses.filter((e) => e.recurring).reduce((sum, e) => sum + (e.amount || 0), 0),
    [expenses],
  );

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/finance?month=${month}`);
        if (!res.ok) throw new Error('Алдаа гарлаа');
        const data = await res.json();
        if (!active) return;
        setHusbandIncome(data.income?.husband ?? 0);
        setWifeIncome(data.income?.wife ?? 0);
        setExpenses(
          (data.expenses ?? []).map((e: any) => ({
            id: crypto.randomUUID(),
            label: e.label ?? '',
            amount: Number(e.amount ?? 0),
            recurring: Boolean(e.recurring),
            paid: Boolean(e.paid),
          })) || [],
        );
        setGoals(
          (data.goals ?? []).map((g: any) => ({
            id: crypto.randomUUID(),
            title: g.title ?? '',
            target: Number(g.target ?? 0),
            due: g.due ?? '',
            done: Boolean(g.done),
            recurring: Boolean(g.recurring),
            saved: Number(g.saved ?? 0),
          })) || [],
        );
        setLoans(
          (data.loans ?? []).map((l: any) => ({
            id: crypto.randomUUID(),
            title: l.title ?? '',
            amount: Number(l.amount ?? 0),
            due: l.due ?? '',
            paid: Boolean(l.paid),
            recurring: Boolean(l.recurring),
            monthlyPayment: Number(l.monthlyPayment ?? 0),
          })) || [],
        );
      } catch (err) {
        setMessage('Өгөгдөл ачаалахад алдаа гарлаа');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [month]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          income: { husband: husbandIncome, wife: wifeIncome },
          expenses: expenses.map(({ label, amount, recurring, paid }) => ({ label, amount, recurring, paid })),
          goals: goals.map(({ title, target, due, done, recurring, saved }) => ({ title, target, due, done, recurring, saved })),
          loans: loans.map(({ title, amount, due, paid, recurring, monthlyPayment }) => ({ title, amount, due, paid, recurring, monthlyPayment })),
        }),
      });
      if (!res.ok) throw new Error('save failed');
      setMessage('Хадгаллаа');
    } catch (err) {
      setMessage('Хадгалах үед алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  function addExpense() {
    setExpenses([...expenses, { id: crypto.randomUUID(), label: '', amount: 0, recurring: false, paid: false }]);
  }

  function updateExpense(id: string, field: 'label' | 'amount', value: string) {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: field === 'amount' ? Number(value) : value } : e)),
    );
  }

  function toggleExpenseFlag(id: string, field: 'recurring' | 'paid', value: boolean) {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function addGoal() {
    setGoals([...goals, { id: crypto.randomUUID(), title: '', target: 0, due: '', done: false, recurring: false, saved: 0 }]);
  }

  function updateGoal(id: string, field: 'title' | 'target' | 'due' | 'done', value: string | boolean) {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, [field]: field === 'target' ? Number(value) : value } : g,
      ),
    );
  }

  function updateGoalSaved(id: string, value: string) {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, saved: Number(value) } : g)));
  }

  function toggleGoalRecurring(id: string, value: boolean) {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, recurring: value } : g)));
  }

  function removeGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  function addLoan() {
    setLoans([...loans, { id: crypto.randomUUID(), title: '', amount: 0, due: '', paid: false, recurring: false, monthlyPayment: 0 }]);
  }

  function updateLoan(id: string, field: 'title' | 'amount' | 'due' | 'monthlyPayment', value: string) {
    setLoans((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, [field]: field === 'amount' || field === 'monthlyPayment' ? Number(value) : value } : l,
      ),
    );
  }

  function toggleLoanFlag(id: string, field: 'recurring' | 'paid', value: boolean) {
    setLoans((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  function removeLoan(id: string) {
    setLoans((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl">💰</span>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Өрхийн төсөв</p>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Сарын орлого, зарлага, зорилго, зээл
            </h1>
            <p className="text-sm text-slate-600">Нөхөр, эхнэрийн цалин, зарлага, хуримтлал, зээлээ нэг дор хяна.</p>
          </div>
          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-2xl bg-white/80 backdrop-blur-sm px-5 py-3 shadow-lg ring-1 ring-slate-200/50">
              <label className="text-sm font-medium text-slate-700" htmlFor="month">
                📅 Сар:
              </label>
              <input
                id="month"
                type="month"
                className="rounded-lg border-2 border-slate-200 px-3 py-1.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <button
              className="rounded-2xl bg-gradient-to-r from-slate-600 to-slate-700 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
              type="button"
              onClick={async () => {
                setLoggingOut(true);
                await fetch('/api/auth/logout', { method: 'POST' });
                setLoggingOut(false);
                window.location.href = '/login';
              }}
              disabled={loggingOut}
            >
              {loggingOut ? 'Гарах...' : '👋 Гарах'}
            </button>
          </div>
        </header>

        <section className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="group rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-lg ring-1 ring-emerald-100 transition hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Нийт орлого</p>
              <span className="text-2xl">💵</span>
            </div>
            <p className="text-3xl font-bold text-emerald-700">{incomeTotal.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 mt-1">Нөхөр + эхнэр</p>
          </div>
          <div className="group rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-lg ring-1 ring-amber-100 transition hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Төлөвлөсөн зарлага</p>
              <span className="text-2xl">💳</span>
            </div>
            <p className="text-3xl font-bold text-amber-700">{expenseTotal.toLocaleString()}</p>
            <p className="text-xs text-amber-600 mt-1">Төлсөн: {expensePaidTotal.toLocaleString()} · Дутуу: {expenseRemaining.toLocaleString()}</p>
          </div>
          <div className="group rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-lg ring-1 ring-indigo-100 transition hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Зорилгод төлөвлөсөн</p>
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-3xl font-bold text-indigo-700">{goalsPlanned.toLocaleString()}</p>
            <p className="text-xs text-indigo-600 mt-1">Хугацаа хэтэрсэн: {goalsOverdueCount}</p>
          </div>
          <div className="group rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-6 shadow-lg ring-1 ring-slate-200 transition hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Net (Орлого - Зарлага)</p>
              <span className="text-2xl">📊</span>
            </div>
            <p className={`text-3xl font-bold ${netAfterExpenses >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{netAfterExpenses.toLocaleString()}</p>
            <p className="text-xs text-slate-600 mt-1">Зорилгоос өмнөх үлдэгдэл</p>
          </div>
          <div className="group rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 p-6 shadow-lg ring-1 ring-emerald-100 transition hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Чөлөөт мөнгө</p>
              <span className="text-2xl">💰</span>
            </div>
            <p className={`text-3xl font-bold ${freeCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{freeCash.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 mt-1">Чөлөөтэй зарцуулах боломж</p>
          </div>
          <div className="group rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-lg ring-1 ring-blue-100 transition hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Дараагийн сар</p>
              <span className="text-2xl">🔄</span>
            </div>
            <p className="text-3xl font-bold text-blue-700">{recurringForecast.toLocaleString()}</p>
            <p className="text-xs text-blue-600 mt-1">Давтагддаг зарлагууд</p>
          </div>
          <div className="group rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 p-6 shadow-lg ring-1 ring-rose-100 transition hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Нийт зээл</p>
              <span className="text-2xl">🏦</span>
            </div>
            <p className="text-3xl font-bold text-rose-700">{loanTotal.toLocaleString()}</p>
            <p className="text-xs text-rose-600 mt-1">Төлсөн: {loanPaidTotal.toLocaleString()} · Үлдэгдэл: {loanRemaining.toLocaleString()}</p>
          </div>
          <div className="group rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 p-6 shadow-lg ring-1 ring-red-100 transition hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Сарын зээлийн төлбөр</p>
              <span className="text-2xl">💸</span>
            </div>
            <p className="text-3xl font-bold text-red-700">{loanMonthlyTotal.toLocaleString()}</p>
            <p className="text-xs text-red-600 mt-1">Сар бүр төлөх дүн</p>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2">
            <span className="mr-2">✓</span>
            {message}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2 mb-6">
          <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-6 shadow-lg ring-1 ring-slate-200/50">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">💵</span>
              <h2 className="text-xl font-bold text-slate-900">Орлого</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-slate-700">👨 Нөхөр</label>
                <input
                  type="number"
                  className="w-48 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-right transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={husbandIncome}
                  onChange={(e) => setHusbandIncome(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-slate-700">👩 Эхнэр</label>
                <input
                  type="number"
                  className="w-48 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-right transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={wifeIncome}
                  onChange={(e) => setWifeIncome(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 border border-emerald-100">
                <span className="text-sm font-bold text-emerald-700">💰 Нийт орлого</span>
                <span className="text-xl font-bold text-emerald-700">{incomeTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-6 shadow-lg ring-1 ring-slate-200/50">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📊</span>
              <h2 className="text-xl font-bold text-slate-900">Тойм</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">💳 Нийт зарлага</span>
                <span className="font-bold text-amber-600">{expenseTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">🏦 Нийт зээл</span>
                <span className="font-bold text-rose-600">{loanTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">🎯 Зорилгод төлөвлөсөн</span>
                <span className="font-bold text-indigo-600">{goalsPlanned.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between border-t-2 border-slate-200 pt-3 mt-3">
                <span className="font-bold text-slate-700">💰 Үлдэгдэл</span>
                <span className={`text-lg font-bold ${netAfterExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {netAfterExpenses.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mt-2">
                💡 Таны үлдэгдлийг хуримтлал, зорилгодоо хуваарилаарай.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-6 shadow-lg ring-1 ring-slate-200/50">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💳</span>
                <h2 className="text-xl font-bold text-slate-900">Зарлага</h2>
              </div>
              <button
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:-translate-y-0.5"
                type="button"
                onClick={addExpense}
              >
                + Нэмэх
              </button>
            </div>
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div key={expense.id} className="group rounded-xl border-2 border-slate-200 bg-gradient-to-r from-white to-slate-50/50 p-4 transition hover:border-amber-300 hover:shadow-md">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                    <input
                      className="flex-1 rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      placeholder="Тайлбар (түрээс, хоол...)"
                      value={expense.label}
                      onChange={(e) => updateExpense(expense.id, 'label', e.target.value)}
                    />
                    <div className="flex w-full items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 sm:w-48 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100">
                      <span className="text-sm font-semibold text-amber-600">₮</span>
                      <input
                        className="w-full border-none bg-transparent px-1 py-0 text-right text-sm outline-none"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={1000}
                        value={expense.amount}
                        onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                      />
                    </div>
                  </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <label className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 cursor-pointer transition hover:bg-slate-200">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={expense.recurring ?? false}
                        onChange={(e) => toggleExpenseFlag(expense.id, 'recurring', e.target.checked)}
                      />
                      🔄 Давтагдана
                    </label>
                    <label className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 font-medium text-emerald-700 cursor-pointer transition hover:bg-emerald-200">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={expense.paid ?? false}
                        onChange={(e) => toggleExpenseFlag(expense.id, 'paid', e.target.checked)}
                      />
                      ✅ Төлсөн
                    </label>
                      {!expense.paid && (
                        <span className="rounded-lg bg-amber-100 px-3 py-1.5 font-semibold text-amber-700 border border-amber-200">⏳ Дутуу</span>
                      )}
                    <button
                      className="ml-auto rounded-lg border-2 border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                      type="button"
                      onClick={() => removeExpense(expense.id)}
                    >
                      🗑️ Устгах
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-6 shadow-lg ring-1 ring-slate-200/50">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <h2 className="text-xl font-bold text-slate-900">Зорилго</h2>
              </div>
              <button
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:-translate-y-0.5"
                type="button"
                onClick={addGoal}
              >
                + Нэмэх
              </button>
            </div>
            <div className="space-y-4">
              {goals.map((goal) => {
                const overdue = goal.due && !goal.done && new Date(goal.due) < new Date();
                return (
                  <div key={goal.id} className="group rounded-xl border-2 border-slate-200 bg-gradient-to-r from-white to-indigo-50/30 p-4 transition hover:border-indigo-300 hover:shadow-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <input
                        className="flex-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        placeholder="Зорилго (их сургуулийн төлбөр гэх мэт)"
                        value={goal.title}
                        onChange={(e) => updateGoal(goal.id, 'title', e.target.value)}
                      />
                      <label className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 cursor-pointer transition hover:bg-emerald-200">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={goal.done}
                          onChange={(e) => updateGoal(goal.id, 'done', e.target.checked)}
                        />
                        ✅ Төлсөн
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <div className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                        <span className="text-sm font-semibold text-indigo-600">₮</span>
                        <input
                          className="w-24 border-none bg-transparent px-1 py-0 text-right text-sm outline-none"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={1000}
                          value={goal.target}
                          onChange={(e) => updateGoal(goal.id, 'target', e.target.value)}
                        />
                      </div>
                      <input
                        className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        type="date"
                        value={goal.due}
                        onChange={(e) => updateGoal(goal.id, 'due', e.target.value)}
                      />
                      <div className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                        <span className="text-xs font-semibold text-indigo-600">💰 Saved</span>
                        <input
                          className="w-20 border-none bg-transparent px-1 py-0 text-right text-sm outline-none"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={1000}
                          value={goal.saved ?? 0}
                          onChange={(e) => updateGoalSaved(goal.id, e.target.value)}
                        />
                      </div>
                      <label className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer transition hover:bg-slate-200">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={goal.recurring ?? false}
                          onChange={(e) => toggleGoalRecurring(goal.id, e.target.checked)}
                        />
                        🔄 Давтагдана
                      </label>
                      <div className="flex items-center gap-2 text-xs">
                        {overdue && !goal.done && (
                          <span className="rounded-lg bg-rose-100 px-3 py-1.5 font-semibold text-rose-600 border border-rose-200">⏰ Хугацаа хэтэрсэн</span>
                        )}
                        {!goal.done && (
                          <span className="rounded-lg bg-amber-100 px-3 py-1.5 font-semibold text-amber-700 border border-amber-200">⏳ Дутуу</span>
                        )}
                      </div>
                      <button
                        className="ml-auto rounded-lg border-2 border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                        type="button"
                        onClick={() => removeGoal(goal.id)}
                      >
                        🗑️ Устгах
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-6 shadow-lg ring-1 ring-slate-200/50">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏬</span>
                <h2 className="text-xl font-bold text-slate-900">Зээл</h2>
              </div>
              <button
                className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:-translate-y-0.5"
                type="button"
                onClick={addLoan}
              >
                + Нэмэх
              </button>
            </div>
            <div className="space-y-4">
              {loans.map((loan) => {
                const overdue = loan.due && !loan.paid && new Date(loan.due) < new Date();
                return (
                  <div key={loan.id} className="group rounded-xl border-2 border-slate-200 bg-gradient-to-r from-white to-rose-50/30 p-4 transition hover:border-rose-300 hover:shadow-md">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                      <input
                        className="flex-1 rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                        placeholder="Зээлийн нэр (банк, хувийн зээл...)"
                        value={loan.title}
                        onChange={(e) => updateLoan(loan.id, 'title', e.target.value)}
                      />
                      <div className="flex w-full items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 sm:w-48 transition focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-100">
                        <span className="text-sm font-semibold text-rose-600">₮</span>
                        <input
                          className="w-full border-none bg-transparent px-1 py-0 text-right text-sm outline-none"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={1000}
                          value={loan.amount}
                          onChange={(e) => updateLoan(loan.id, 'amount', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <input
                        className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                        type="date"
                        value={loan.due}
                        onChange={(e) => updateLoan(loan.id, 'due', e.target.value)}
                      />
                      <div className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 transition focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-100">
                        <span className="text-xs font-semibold text-rose-600">💸 Сар бүр</span>
                        <input
                          className="w-20 border-none bg-transparent px-1 py-0 text-right text-sm outline-none"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={1000}
                          value={loan.monthlyPayment ?? 0}
                          onChange={(e) => updateLoan(loan.id, 'monthlyPayment', e.target.value)}
                        />
                      </div>
                      <label className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer transition hover:bg-slate-200">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={loan.recurring ?? false}
                          onChange={(e) => toggleLoanFlag(loan.id, 'recurring', e.target.checked)}
                        />
                        🔄 Давтагдана
                      </label>
                      <label className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-700 cursor-pointer transition hover:bg-emerald-200">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={loan.paid ?? false}
                          onChange={(e) => toggleLoanFlag(loan.id, 'paid', e.target.checked)}
                        />
                        ✅ Төлсөн
                      </label>
                      <div className="flex items-center gap-2 text-xs">
                        {overdue && !loan.paid && (
                          <span className="rounded-lg bg-rose-100 px-3 py-1.5 font-semibold text-rose-600 border border-rose-200">⏰ Хугацаа хэтэрсэн</span>
                        )}
                        {!loan.paid && (
                          <span className="rounded-lg bg-amber-100 px-3 py-1.5 font-semibold text-amber-700 border border-amber-200">⏳ Дутуу</span>
                        )}
                      </div>
                      <button
                        className="ml-auto rounded-lg border-2 border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                        type="button"
                        onClick={() => removeLoan(loan.id)}
                      >
                        🗑️ Устгах
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            className="group relative rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-xl transition hover:shadow-2xl hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            type="button"
            onClick={save}
            disabled={saving}
          >
            <span className="flex items-center gap-2">
              {saving ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  Хадгалж байна...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Хадгалах
                </>
              )}
            </span>
          </button>
          {loading && (
            <span className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 border border-blue-100">
              <span className="inline-block animate-spin">⏳</span>
              Сар ачаалж байна...
            </span>
          )}
          {(expenseTotal > incomeTotal || goalsPlanned + expenseTotal > incomeTotal) && (
            <span className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 border border-amber-200 shadow-sm">
              <span>⚠️</span>
              Анхаар: Зарлага/зорилго орлогоос их байна
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
