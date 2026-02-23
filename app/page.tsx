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

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Өрхийн төсөв</p>
            <h1 className="text-3xl font-bold">Сарын орлого, зарлага, зорилго</h1>
            <p className="text-sm text-slate-600">Нөхөр, эхнэрийн цалин, зарлага, хуримтлалаа нэг дор хяна.</p>
          </div>
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-slate-100">
              <label className="text-sm text-slate-600" htmlFor="month">
                Сар:
              </label>
              <input
                id="month"
                type="month"
                className="rounded border border-slate-200 px-2 py-1 text-sm"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <button
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
              type="button"
              onClick={async () => {
                setLoggingOut(true);
                await fetch('/api/auth/logout', { method: 'POST' });
                setLoggingOut(false);
                window.location.href = '/login';
              }}
              disabled={loggingOut}
            >
              {loggingOut ? 'Гарах...' : 'Гарах'}
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs uppercase tracking-wide text-slate-500">Нийт орлого</p>
            <p className="text-2xl font-bold text-slate-900">{incomeTotal.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Нөхөр + эхнэр</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs uppercase tracking-wide text-slate-500">Төлөвлөсөн зарлага</p>
            <p className="text-2xl font-bold text-amber-600">{expenseTotal.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Төлсөн: {expensePaidTotal.toLocaleString()} · Дутуу: {expenseRemaining.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs uppercase tracking-wide text-slate-500">Зорилгод төлөвлөсөн</p>
            <p className="text-2xl font-bold text-indigo-600">{goalsPlanned.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Хугацаа хэтэрсэн: {goalsOverdueCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs uppercase tracking-wide text-slate-500">Net (Орлого - Зарлага)</p>
            <p className={`text-2xl font-bold ${netAfterExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{netAfterExpenses.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Зорилгоос өмнөх үлдэгдэл</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs uppercase tracking-wide text-slate-500">Чөлөөт мөнгө (Net - Зорилго)</p>
            <p className={`text-2xl font-bold ${freeCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{freeCash.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Чөлөөтэй зарцуулах боломж</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs uppercase tracking-wide text-slate-500">Дараагийн сар (давтагддаг)</p>
            <p className="text-2xl font-bold text-slate-900">{recurringForecast.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Expected expense from recurring</p>
          </div>
        </section>

        {message && <div className="mb-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">{message}</div>}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-3 text-lg font-semibold">Орлого</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm text-slate-700">Нөхөр</label>
                <input
                  type="number"
                  className="w-40 rounded border border-slate-200 px-3 py-2 text-right"
                  value={husbandIncome}
                  onChange={(e) => setHusbandIncome(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm text-slate-700">Эхнэр</label>
                <input
                  type="number"
                  className="w-40 rounded border border-slate-200 px-3 py-2 text-right"
                  value={wifeIncome}
                  onChange={(e) => setWifeIncome(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-semibold text-slate-700">Нийт орлого</span>
                <span className="text-lg font-bold text-indigo-600">{incomeTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-3 text-lg font-semibold">Тойм</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Нийт зарлага</span>
                <span className="font-semibold text-amber-600">{expenseTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Үлдэгдэл</span>
                <span className={`font-semibold ${netAfterExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {netAfterExpenses.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-500">Таны үлдэгдлийг хуримтлал, зорилгодоо хуваарилаарай.</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Зарлага</h2>
              <button
                className="rounded-lg bg-slate-900 px-3 py-1 text-sm text-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
                type="button"
                onClick={addExpense}
              >
                + Нэмэх
              </button>
            </div>
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <input
                      className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Тайлбар (түрээс, хоол...)"
                      value={expense.label}
                      onChange={(e) => updateExpense(expense.id, 'label', e.target.value)}
                    />
                    <div className="flex w-full items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1 sm:w-44">
                      <span className="text-xs text-slate-500">₮</span>
                      <input
                        className="w-full border-none bg-transparent px-1 py-1 text-right text-sm outline-none"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={1000}
                        value={expense.amount}
                        onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                      />
                    </div>
                  </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-700">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={expense.recurring ?? false}
                        onChange={(e) => toggleExpenseFlag(expense.id, 'recurring', e.target.checked)}
                      />
                      Сар бүр давтагдана
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={expense.paid ?? false}
                        onChange={(e) => toggleExpenseFlag(expense.id, 'paid', e.target.checked)}
                      />
                      Төлсөн
                    </label>
                      {!expense.paid && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Дутуу</span>
                      )}
                    <button
                      className="ml-auto rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                      type="button"
                      onClick={() => removeExpense(expense.id)}
                    >
                      Устгах
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Зорилго</h2>
              <button
                className="rounded-lg bg-indigo-600 px-3 py-1 text-sm text-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
                type="button"
                onClick={addGoal}
              >
                + Нэмэх
              </button>
            </div>
            <div className="space-y-3">
              {goals.map((goal) => {
                const overdue = goal.due && !goal.done && new Date(goal.due) < new Date();
                return (
                  <div key={goal.id} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Зорилго (их сургуулийн төлбөр гэх мэт)"
                        value={goal.title}
                        onChange={(e) => updateGoal(goal.id, 'title', e.target.value)}
                      />
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={goal.done}
                          onChange={(e) => updateGoal(goal.id, 'done', e.target.checked)}
                        />
                        Төлсөн 
                      </label>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                      <div className="flex w-36 items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1">
                        <span className="text-xs text-slate-500">₮</span>
                        <input
                          className="w-full border-none bg-transparent px-1 py-1 text-right text-sm outline-none"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={1000}
                          value={goal.target}
                          onChange={(e) => updateGoal(goal.id, 'target', e.target.value)}
                        />
                      </div>
                      <input
                        className="w-40 rounded border border-slate-200 px-3 py-2"
                        type="date"
                        value={goal.due}
                        onChange={(e) => updateGoal(goal.id, 'due', e.target.value)}
                      />
                      <div className="flex w-40 items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1">
                        <span className="text-xs text-slate-500">Saved</span>
                        <input
                          className="w-full border-none bg-transparent px-1 py-1 text-right text-sm outline-none"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={1000}
                          value={goal.saved ?? 0}
                          onChange={(e) => updateGoalSaved(goal.id, e.target.value)}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={goal.recurring ?? false}
                          onChange={(e) => toggleGoalRecurring(goal.id, e.target.checked)}
                        />
                        Сар бүр давтагдана
                      </label>
                      <div className="flex items-center gap-2 text-xs">
                        {overdue && !goal.done && (
                          <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-600">Хугацаа хэтэрсэн</span>
                        )}
                        {!goal.done && (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Дутуу</span>
                        )}
                      </div>
                      <button
                        className="ml-auto rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                        type="button"
                        onClick={() => removeGoal(goal.id)}
                      >
                        Устгах
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
            type="button"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
          {loading && <span className="text-sm text-slate-500">Сар ачаалж байна...</span>}
          {(expenseTotal > incomeTotal || goalsPlanned + expenseTotal > incomeTotal) && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
              Анхаар: Зарлага/зорилго орлогоос их байна
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
