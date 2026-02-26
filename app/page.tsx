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
type Savings = {
  id: string;
  name: string;
  amount: number; // Нийт үлдэгдэл
  monthlyDeposit: number; // Энэ сард нэмэх дүн
  depositPaid: boolean; // Сарын хуримтлал банкинд хийгдсэн эсэх
  interestRate: number; // Жилийн хүү %
  interestDay: number; // Сарын хэдэнд хүү ордог (1-31)
};

type Member = { id: string; name: string; salary: number };

export default function Home() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: crypto.randomUUID(), label: 'Хоол', amount: 0, recurring: true, paid: false },
  ]);
  const [goals, setGoals] = useState<Goal[]>([
    { id: crypto.randomUUID(), title: 'Хуримтлал', target: 0, due: '', done: false, recurring: true, saved: 0 },
  ]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [savings, setSavings] = useState<Savings[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'goal' | 'loan' | 'savings'>('income');

  const incomeTotal = useMemo(() => members.reduce((sum, m) => sum + (m.salary || 0), 0), [members]);
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
  const savingsTotal = useMemo(() => savings.reduce((sum, s) => sum + (s.amount || 0), 0), [savings]);
  const savingsMonthlyDeposit = useMemo(
    () => savings.reduce((sum, s) => sum + (s.monthlyDeposit || 0), 0),
    [savings],
  );
  const savingsInterestMonthly = useMemo(
    () => savings.reduce((sum, s) => {
      const annualRate = s.interestRate || 0;
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const interestDay = Math.min(s.interestDay || 1, daysInMonth);
      // Хэрэв хүү орох өдөр өнгөрсөн бол энэ сарын хүүг тооцно, үгүй бол 0
      const alreadyCredited = today.getDate() >= interestDay;
      return sum + (alreadyCredited ? (s.amount || 0) * annualRate / 100 / 12 : 0);
    }, 0),
    [savings],
  );
  const netAfterExpenses = useMemo(() => incomeTotal - expenseTotal, [incomeTotal, expenseTotal]);
  const freeCash = useMemo(
    () => incomeTotal - expenseTotal - goalsPlanned - loanMonthlyTotal - savingsMonthlyDeposit,
    [incomeTotal, expenseTotal, goalsPlanned, loanMonthlyTotal, savingsMonthlyDeposit],
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
        // Хуучин { husband, wife } форматыг members болгон хөрвүүлнэ
        if (Array.isArray(data.income?.members)) {
          setMembers(data.income.members.map((m: any) => ({
            id: crypto.randomUUID(),
            name: m.name ?? '',
            salary: Number(m.salary ?? 0),
          })));
        } else {
          const legacy: Member[] = [];
          if ((data.income?.husband ?? 0) > 0)
            legacy.push({ id: crypto.randomUUID(), name: 'Нөхөр', salary: Number(data.income.husband) });
          if ((data.income?.wife ?? 0) > 0)
            legacy.push({ id: crypto.randomUUID(), name: 'Эхнэр', salary: Number(data.income.wife) });
          setMembers(legacy);
        }
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
        setSavings(
          (data.savings ?? []).map((s: any) => ({
            id: crypto.randomUUID(),
            name: s.name ?? '',
            amount: Number(s.amount ?? 0),
            monthlyDeposit: Number(s.monthlyDeposit ?? 0),
            depositPaid: Boolean(s.depositPaid),
            interestRate: Number(s.interestRate ?? 0),
            interestDay: Number(s.interestDay ?? 1),
          })) || [],
        );
      } catch (err) {
        setMessageType('error');
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
          income: { members: members.map(({ name, salary }) => ({ name, salary })) },
          expenses: expenses.map(({ label, amount, recurring, paid }) => ({ label, amount, recurring, paid })),
          goals: goals.map(({ title, target, due, done, recurring, saved }) => ({ title, target, due, done, recurring, saved })),
          loans: loans.map(({ title, amount, due, paid, recurring, monthlyPayment }) => ({ title, amount, due, paid, recurring, monthlyPayment })),
          savings: savings.map(({ name, amount, monthlyDeposit, depositPaid, interestRate, interestDay }) => ({ name, amount, monthlyDeposit, depositPaid, interestRate, interestDay })),
        }),
      });
      if (!res.ok) throw new Error('save failed');
      setMessageType('success');
      setMessage('Хадгаллаа');
    } catch (err) {
      setMessageType('error');
      setMessage('Хадгалах үед алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  function addMember() {
    setMembers((prev) => [...prev, { id: crypto.randomUUID(), name: '', salary: 0 }]);
  }

  function updateMember(id: string, field: 'name' | 'salary', value: string | number) {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: field === 'salary' ? Number(value) : value } : m)),
    );
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
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

  function addSavings() {
    setSavings([...savings, { id: crypto.randomUUID(), name: '', amount: 0, monthlyDeposit: 0, depositPaid: false, interestRate: 0, interestDay: 1 }]);
  }

  function updateSavings(id: string, field: 'name' | 'amount' | 'monthlyDeposit' | 'interestRate' | 'interestDay', value: string) {
    setSavings((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, [field]: field === 'name' ? value : Number(value) } : s,
      ),
    );
  }

  function toggleSavingsDepositPaid(id: string, value: boolean) {
    setSavings((prev) => prev.map((s) => (s.id === id ? { ...s, depositPaid: value } : s)));
  }

  function removeSavings(id: string) {
    setSavings((prev) => prev.filter((s) => s.id !== id));
  }

  // Calculate monthly interest for a specific savings
  function calculateMonthlyInterest(amount: number, interestRate: number): number {
    return (amount * interestRate) / 100 / 12;
  }

  // Formatted number input — shows 1,000,000 style, edits as plain number
  function NumberInput({
    value,
    onChange,
    className,
    placeholder = '0',
    allowDecimal = false,
  }: {
    value: number;
    onChange: (v: number) => void;
    className?: string;
    placeholder?: string;
    allowDecimal?: boolean;
  }) {
    const [focused, setFocused] = useState(false);
    const [raw, setRaw] = useState('');
    const display = focused ? raw : (value > 0 ? value.toLocaleString() : '');
    function parse(str: string) {
      const cleaned = str.replace(/[^0-9.]/g, '');
      const num = allowDecimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
      return isNaN(num) ? 0 : num;
    }
    return (
      <input
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        className={className}
        placeholder={placeholder}
        value={display}
        onFocus={() => { setRaw(value > 0 ? String(value) : ''); setFocused(true); }}
        onBlur={() => { setFocused(false); onChange(parse(raw)); }}
        onChange={(e) => setRaw(e.target.value)}
      />
    );
  }

  // Progress bar helper
  function ProgressBar({ current, total, color = 'emerald' }: { current: number; total: number; color?: string }) {
    const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
    const colorClasses: Record<string, string> = {
      emerald: 'bg-emerald-500',
      amber: 'bg-amber-500',
      rose: 'bg-rose-500',
      indigo: 'bg-indigo-500',
      green: 'bg-green-500',
    };
    return (
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full transition-all duration-700 ease-out ${colorClasses[color] || 'bg-slate-400'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }

  // Short number formatter: 1,500,000 → 1.5сая₮
  function fmt(n: number): string {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'сая₮';
    return n.toLocaleString() + '₮';
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
        <header className="mb-5 flex items-center justify-between gap-3 sm:mb-8">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent sm:text-3xl">
              💰 Санхүүгийн самбар
            </h1>
            <p className="hidden text-xs font-semibold uppercase tracking-wide text-indigo-500 sm:block">Танай гэр бүлд зориулав</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-white/80 backdrop-blur-sm px-3 py-2 shadow ring-1 ring-slate-200/50 sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-2.5">
              <label className="text-xs font-medium text-slate-500 sm:text-sm sm:text-slate-700" htmlFor="month">📅</label>
              <input
                id="month"
                type="month"
                className="rounded-md border border-slate-200 px-1.5 py-1 text-xs transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100 sm:rounded-lg sm:border-2 sm:px-3 sm:py-1.5 sm:text-sm"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <button
              className="rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 px-3 py-2 text-xs font-semibold text-white shadow transition hover:shadow-lg disabled:opacity-60 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm"
              type="button"
              onClick={async () => {
                setLoggingOut(true);
                await fetch('/api/auth/logout', { method: 'POST' });
                setLoggingOut(false);
                window.location.href = '/login';
              }}
              disabled={loggingOut}
            >
              {loggingOut ? '...' : 'Гарах'}
            </button>
          </div>
        </header>

        {/* ─── Budget Hero Banner ─── */}
        <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-xl sm:mb-6 sm:rounded-3xl sm:shadow-2xl">
          <div className="relative p-4 sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-white/5" />

            {/* Mobile: compact row layout */}
            <div className="relative flex items-center justify-between gap-3 sm:hidden">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-indigo-200/80">
                  {new Date(month + '-01').toLocaleString('mn-MN', { year: 'numeric', month: 'long' })}
                </p>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${freeCash >= 0 ? 'bg-emerald-400/20 text-emerald-200 ring-emerald-400/30' : 'bg-rose-400/20 text-rose-200 ring-rose-400/30'}`}>
                  {freeCash >= 0 ? '✅ Тэнцвэртэй' : '⚠️ Хэтэрсэн'}
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10">
                <div className="px-2.5 py-2 text-center">
                  <p className="text-[9px] font-medium text-emerald-200">Орлого</p>
                  <p className="text-xs font-extrabold text-white">{fmt(incomeTotal)}</p>
                </div>
                <div className="px-2.5 py-2 text-center">
                  <p className="text-[9px] font-medium text-amber-200">Зарлага</p>
                  <p className="text-xs font-extrabold text-amber-200">{fmt(expenseTotal + loanMonthlyTotal + goalsPlanned + savingsMonthlyDeposit)}</p>
                </div>
                <div className="px-2.5 py-2 text-center">
                  <p className="text-[9px] font-medium text-indigo-200">Чөлөөт</p>
                  <p className={`text-xs font-extrabold ${freeCash >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {freeCash >= 0 ? '+' : ''}{fmt(freeCash)}
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop: full layout */}
            <div className="relative hidden flex-col gap-5 sm:flex sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200/80">Санхүүгийн тойм</p>
                <h2 className="mt-1 text-2xl font-extrabold text-white">
                  {new Date(month + '-01').toLocaleString('mn-MN', { year: 'numeric', month: 'long' })}
                </h2>
                <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${freeCash >= 0 ? 'bg-emerald-400/20 text-emerald-200 ring-emerald-400/30' : 'bg-rose-400/20 text-rose-200 ring-rose-400/30'}`}>
                  {freeCash >= 0 ? '✅ Тэнцвэртэй төсөв' : '⚠️ Зардал орлогоос давсан'}
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/10">
                <div className="px-6 py-4 text-center">
                  <p className="text-xs font-medium text-emerald-200">Орлого</p>
                  <p className="mt-1 text-xl font-extrabold text-white">{fmt(incomeTotal)}</p>
                </div>
                <div className="px-6 py-4 text-center">
                  <p className="text-xs font-medium text-amber-200">Нийт зарлага</p>
                  <p className="mt-1 text-xl font-extrabold text-amber-200">{fmt(expenseTotal + loanMonthlyTotal + goalsPlanned + savingsMonthlyDeposit)}</p>
                </div>
                <div className="px-6 py-4 text-center">
                  <p className="text-xs font-medium text-indigo-200">Чөлөөт</p>
                  <p className={`mt-1 text-xl font-extrabold ${freeCash >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {freeCash >= 0 ? '+' : ''}{fmt(freeCash)}
                  </p>
                </div>
              </div>
            </div>
            {incomeTotal > 0 && (
              <div className="relative mt-6">
                <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="bg-amber-400/80 transition-all duration-700" style={{ width: `${Math.min((expenseTotal / incomeTotal) * 100, 100)}%` }} />
                  <div className="bg-rose-400/80 transition-all duration-700" style={{ width: `${Math.min((loanMonthlyTotal / incomeTotal) * 100, 100)}%` }} />
                  <div className="bg-violet-300/80 transition-all duration-700" style={{ width: `${Math.min((goalsPlanned / incomeTotal) * 100, 100)}%` }} />
                  <div className="bg-emerald-400/80 transition-all duration-700" style={{ width: `${Math.min((savingsMonthlyDeposit / incomeTotal) * 100, 100)}%` }} />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
                  {([
                    { color: 'bg-amber-400/80',  label: 'Зарлага',   val: expenseTotal },
                    { color: 'bg-rose-400/80',    label: 'Зээл',      val: loanMonthlyTotal },
                    { color: 'bg-violet-300/80',  label: 'Зорилго',   val: goalsPlanned },
                    { color: 'bg-emerald-400/80', label: 'Хадгаламж', val: savingsMonthlyDeposit },
                  ] as const).map(({ color, label, val }) => (
                    <span key={label} className="flex items-center gap-1.5 text-xs text-white/60">
                      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
                      {label} · {Math.round((val / incomeTotal) * 100)}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Summary Cards ─── */}
        <section className="mb-5 grid grid-cols-2 gap-2.5 sm:mb-8 sm:gap-4 lg:grid-cols-3">

          {/* Орлого */}
          <div className="group flex flex-col rounded-xl bg-white p-3 shadow-sm ring-1 ring-emerald-100 sm:rounded-2xl sm:p-5 sm:shadow-md sm:hover:-translate-y-1 sm:hover:shadow-xl transition-all duration-200">
            <div className="mb-2 flex items-center gap-2 sm:mb-4 sm:gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-base sm:h-11 sm:w-11 sm:rounded-xl sm:text-2xl">💵</div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-xs">Орлого</p>
                <p className="text-sm font-extrabold text-slate-900 sm:text-2xl">{fmt(incomeTotal)}</p>
              </div>
            </div>
            <div className="mt-auto space-y-1 border-t border-slate-100 pt-2 sm:space-y-1.5 sm:pt-3">
              {members.length > 0
                ? members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between">
                      <span className="truncate text-[10px] text-slate-500 sm:text-xs">👤 {m.name || '—'}</span>
                      <span className="ml-1 shrink-0 text-[10px] font-semibold text-emerald-700 sm:text-xs">{m.salary.toLocaleString()}₮</span>
                    </div>
                  ))
                : <p className="text-[10px] italic text-slate-400 sm:text-xs">Бүртгэгдээгүй</p>
              }
            </div>
          </div>

          {/* Зарлага */}
          <div className="group flex flex-col rounded-xl bg-white p-3 shadow-sm ring-1 ring-amber-100 sm:rounded-2xl sm:p-5 sm:shadow-md sm:hover:-translate-y-1 sm:hover:shadow-xl transition-all duration-200">
            <div className="mb-2 flex items-center gap-2 sm:mb-4 sm:gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-base sm:h-11 sm:w-11 sm:rounded-xl sm:text-2xl">🧾</div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 sm:text-xs">Зарлага</p>
                <p className="text-sm font-extrabold text-slate-900 sm:text-2xl">{fmt(expenseTotal)}</p>
              </div>
            </div>
            <div className="mt-auto border-t border-slate-100 pt-2 sm:pt-3">
              <div className="flex justify-between text-[10px] sm:text-xs">
                <span className="text-slate-500">Төлсөн</span>
                <span className="font-bold text-amber-600">{expenseTotal > 0 ? Math.round((expensePaidTotal / expenseTotal) * 100) : 0}%</span>
              </div>
              <ProgressBar current={expensePaidTotal} total={expenseTotal} color="amber" />
            </div>
          </div>

          {/* Зорилго */}
          <div className="group flex flex-col rounded-xl bg-white p-3 shadow-sm ring-1 ring-indigo-100 sm:rounded-2xl sm:p-5 sm:shadow-md sm:hover:-translate-y-1 sm:hover:shadow-xl transition-all duration-200">
            <div className="mb-2 flex items-center gap-2 sm:mb-4 sm:gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-base sm:h-11 sm:w-11 sm:rounded-xl sm:text-2xl">🎯</div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 sm:text-xs">Зорилго</p>
                <p className="text-sm font-extrabold text-slate-900 sm:text-2xl">{fmt(goalsPlanned)}</p>
              </div>
            </div>
            <div className="mt-auto space-y-1 border-t border-slate-100 pt-2 sm:space-y-2 sm:pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 sm:text-xs">Нийт</span>
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 sm:px-2.5 sm:text-xs">{goals.length}</span>
              </div>
              <p className={`text-[10px] font-medium sm:text-xs ${goalsOverdueCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {goalsOverdueCount > 0 ? `⚠️ ${goalsOverdueCount} хэтэрсэн` : '✅ Хугацаандаа'}
              </p>
            </div>
          </div>

          {/* Зээл */}
          <div className="group flex flex-col rounded-xl bg-white p-3 shadow-sm ring-1 ring-rose-100 sm:rounded-2xl sm:p-5 sm:shadow-md sm:hover:-translate-y-1 sm:hover:shadow-xl transition-all duration-200">
            <div className="mb-2 flex items-center gap-2 sm:mb-4 sm:gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-base sm:h-11 sm:w-11 sm:rounded-xl sm:text-2xl">💸</div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-600 sm:text-xs">Зээл</p>
                <p className="text-sm font-extrabold text-slate-900 sm:text-2xl">{fmt(loanTotal)}</p>
              </div>
            </div>
            <div className="mt-auto space-y-1 border-t border-slate-100 pt-2 sm:space-y-2 sm:pt-3">
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-slate-500">Сарын</span>
                <span className="font-bold text-rose-700">{loanMonthlyTotal.toLocaleString()}₮</span>
              </div>
              <div className="flex justify-between text-[10px] sm:text-xs">
                <span className="text-slate-500">Төлсөн</span>
                <span className="font-bold text-rose-600">{loanTotal > 0 ? Math.round((loanPaidTotal / loanTotal) * 100) : 0}%</span>
              </div>
              <ProgressBar current={loanPaidTotal} total={loanTotal} color="rose" />
            </div>
          </div>

          {/* Хадгаламж */}
          <div className="group flex flex-col rounded-xl bg-white p-3 shadow-sm ring-1 ring-green-100 sm:rounded-2xl sm:p-5 sm:shadow-md sm:hover:-translate-y-1 sm:hover:shadow-xl transition-all duration-200">
            <div className="mb-2 flex items-center gap-2 sm:mb-4 sm:gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-base sm:h-11 sm:w-11 sm:rounded-xl sm:text-2xl">🏦</div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 sm:text-xs">Хадгаламж</p>
                <p className="text-sm font-extrabold text-slate-900 sm:text-2xl">{fmt(savingsTotal)}</p>
              </div>
            </div>
            <div className="mt-auto space-y-1 border-t border-slate-100 pt-2 sm:space-y-1.5 sm:pt-3">
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-slate-500">+Хуримтлал</span>
                <span className="font-semibold text-green-700">+{savingsMonthlyDeposit.toLocaleString()}₮</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-slate-500">+Хүү</span>
                <span className="font-semibold text-teal-700">+{savingsInterestMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}₮</span>
              </div>
            </div>
          </div>

          {/* Чөлөөт үлдэгдэл */}
          <div className={`group flex flex-col rounded-xl p-3 shadow-sm transition-all duration-200 sm:rounded-2xl sm:p-5 sm:shadow-md sm:hover:-translate-y-1 sm:hover:shadow-xl ${freeCash >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500 ring-1 ring-emerald-400/30' : 'bg-gradient-to-br from-rose-500 to-pink-600 ring-1 ring-rose-400/30'}`}>
            <div className="mb-2 flex items-center gap-2 sm:mb-4 sm:gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-base sm:h-11 sm:w-11 sm:rounded-xl sm:text-2xl">
                {freeCash >= 0 ? '💰' : '⚠️'}
              </div>
              <div className="min-w-0">
                <p className={`text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${freeCash >= 0 ? 'text-emerald-100' : 'text-rose-100'}`}>Чөлөөт</p>
                <p className="text-sm font-extrabold text-white sm:text-2xl">
                  {freeCash >= 0 ? '+' : ''}{fmt(freeCash)}
                </p>
              </div>
            </div>
            <div className="mt-auto border-t border-white/20 pt-2 sm:pt-3">
              <p className="text-[10px] text-white/80 sm:text-xs">
                {incomeTotal > 0
                  ? freeCash >= 0
                    ? `Орлогын ${Math.round((freeCash / incomeTotal) * 100)}%`
                    : `${fmt(Math.abs(freeCash))} хэтэрсэн`
                  : 'Орлого оруулна уу'}
              </p>
              {freeCash >= 0 && incomeTotal > 0 && (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/20 sm:h-1.5 sm:mt-1.5">
                  <div className="h-full bg-white/60 transition-all duration-700" style={{ width: `${Math.round((freeCash / incomeTotal) * 100)}%` }} />
                </div>
              )}
            </div>
          </div>

        </section>

        {message && (
          <div
            className={`mb-6 rounded-2xl px-6 py-4 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 flex items-center gap-2 ${
              messageType === 'success'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
            }`}
          >
            <span>{messageType === 'success' ? '✅' : '⚠️'}</span>
            {message}
          </div>
        )}

        {/* Tab bar */}
        <div className="mb-4 flex rounded-xl bg-white/80 backdrop-blur-sm p-1 shadow-md ring-1 ring-slate-200/50 gap-1 sm:mb-6 sm:rounded-2xl sm:p-1.5">
          {(
            [
              { key: 'income',  label: 'Орлого',    icon: '💵', color: 'emerald', badge: members.length > 0 ? members.length : null },
              { key: 'expense', label: 'Зарлага',   icon: '🧾', color: 'amber',   badge: expenses.length > 0 ? expenses.length : null },
              { key: 'goal',    label: 'Зорилго',   icon: '🎯', color: 'indigo',  badge: goals.length > 0 ? goals.length : null },
              { key: 'loan',    label: 'Зээл',      icon: '💸', color: 'rose',    badge: loans.length > 0 ? loans.length : null },
              { key: 'savings', label: 'Хадгаламж', icon: '🏦', color: 'green',   badge: savings.length > 0 ? savings.length : null },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.key;
            const colorMap = {
              emerald: active ? 'bg-emerald-500 text-white' : 'text-emerald-700 hover:bg-emerald-50',
              amber:   active ? 'bg-amber-500 text-white'   : 'text-amber-700 hover:bg-amber-50',
              indigo:  active ? 'bg-indigo-500 text-white'  : 'text-indigo-700 hover:bg-indigo-50',
              rose:    active ? 'bg-rose-500 text-white'    : 'text-rose-700 hover:bg-rose-50',
              green:   active ? 'bg-green-500 text-white'   : 'text-green-700 hover:bg-green-50',
            };
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold transition-all duration-200 sm:flex-row sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs ${colorMap[tab.color]} ${active ? 'shadow-md' : ''}`}
              >
                <span className="text-sm sm:text-base">{tab.icon}</span>
                <span className="leading-tight">{tab.label}</span>
                {tab.badge != null && (
                  <span className={`absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold sm:static sm:h-auto sm:w-auto sm:rounded-full sm:px-1.5 sm:text-xs ${active ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>

        {/* ── ОРЛОГО tab ── */}
        {activeTab === 'income' && (
        <section className="grid gap-4 lg:grid-cols-2 mb-4 items-start sm:gap-6 sm:mb-6">
          <div className="rounded-xl bg-white/90 backdrop-blur-sm p-4 shadow-md ring-1 ring-slate-200/50 sm:rounded-2xl sm:p-6 sm:shadow-lg">
            <div className="mb-3 flex items-center justify-between sm:mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl">💵</span>
                <h2 className="text-base font-bold text-slate-900 sm:text-xl">Орлого</h2>
              </div>
              <button
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-md sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
                type="button"
                onClick={addMember}
              >
                + Хүн нэмэх
              </button>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {members.length === 0 && (
                <p className="rounded-xl border-2 border-dashed border-slate-200 py-5 text-center text-xs text-slate-400 sm:py-6 sm:text-sm">
                  + Хүн нэмэх товч дарж орлого нэмнэ үү
                </p>
              )}
              {members.map((m) => (
                <div key={m.id} className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-gradient-to-r from-white to-emerald-50/30 p-2.5 transition hover:border-emerald-200 sm:flex-row sm:items-center sm:gap-2 sm:border-2 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-1.5 sm:contents">
                    <span className="text-base sm:text-lg">👤</span>
                    <input
                      className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-100 sm:border-2 sm:px-3 sm:py-2"
                      placeholder="Нэр..."
                      value={m.name}
                      onChange={(e) => updateMember(m.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-1 items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 transition focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-100 sm:w-36 sm:flex-none sm:rounded-xl sm:border-2 sm:px-3 sm:py-2">
                      <NumberInput
                        value={m.salary}
                        onChange={(v) => updateMember(m.id, 'salary', v)}
                        className="w-full bg-transparent text-right text-sm font-semibold outline-none"
                        placeholder="0"
                      />
                      <span className="text-xs font-bold text-slate-400">₮</span>
                    </div>
                    <button
                      className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 sm:border-2 sm:px-2.5 sm:py-2"
                      type="button"
                      onClick={() => removeMember(m.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {members.length > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 border border-emerald-100 mt-2">
                  <span className="text-sm font-bold text-emerald-700">💰 Нийт орлого</span>
                  <span className="text-xl font-bold text-emerald-700">{incomeTotal.toLocaleString()}₮</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-6 shadow-lg ring-1 ring-slate-200/50">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📊</span>
              <h2 className="text-xl font-bold text-slate-900">Тойм</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">💳 Нийт орлого</span>
                <span className="font-bold text-emerald-600">+ {incomeTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">🧾 Нийт зарлага</span>
                <span className="font-bold text-amber-600">− {expenseTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">💸 Сарын зээлийн төлбөр</span>
                <span className="font-bold text-rose-600">− {loanMonthlyTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">🎯 Зорилгод хуваарилсан</span>
                <span className="font-bold text-indigo-600">− {goalsPlanned.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">🏦 Хадгаламжид хийх дүн</span>
                <span className="font-bold text-green-600">− {savingsMonthlyDeposit.toLocaleString()}</span>
              </div>
              {savingsInterestMonthly > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">📈 Хадгаламжийн хүүгийн орлого</span>
                  <span className="font-bold text-teal-600">+ {savingsInterestMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t-2 border-slate-200 pt-3 mt-3">
                <span className="font-bold text-slate-700">💰 Чөлөөт үлдэгдэл</span>
                <span className={`text-lg font-bold ${freeCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {freeCash.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mt-2">
                💡 Зарлага + зээл + зорилго + хадгаламжийг хасаад үлдсэн чөлөөт мөнгө.
              </p>
            </div>
          </div>
        </section>
        )}

        {/* ── ЗАРЛАГА tab ── */}
        {activeTab === 'expense' && (
        <section className="grid gap-6 lg:grid-cols-1 items-start">
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
              {expenses.length === 0 && (
                <p className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                  + Нэмэх товч дарж зарлага нэмнэ үү
                </p>
              )}
              {expenses.map((expense) => (
                <div key={expense.id} className="group rounded-xl border-2 border-slate-200 bg-gradient-to-r from-white to-slate-50/50 p-4 transition hover:border-amber-300 hover:shadow-md">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                    <input
                      className="flex-1 rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      placeholder="Тайлбар (түрээс, хоол...)"
                      value={expense.label}
                      onChange={(e) => updateExpense(expense.id, 'label', e.target.value)}
                    />
                    <div className="flex w-full items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 sm:w-52 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100">
                      <span className="text-sm font-semibold text-amber-600">₮</span>
                      <NumberInput
                        className="w-full bg-transparent text-right text-sm font-semibold outline-none"
                        value={expense.amount}
                        onChange={(v) => updateExpense(expense.id, 'amount', String(v))}
                        placeholder="0"
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
        </section>
        )}

        {/* ── ЗОРИЛГО tab ── */}
        {activeTab === 'goal' && (
        <section className="grid gap-6 lg:grid-cols-1 items-start">
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
              {goals.length === 0 && (
                <p className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                  + Нэмэх товч дарж зорилго нэмнэ үү
                </p>
              )}
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
                        <span className="text-xs font-semibold text-indigo-500">🎯 Зорилго</span>
                        <NumberInput
                          className="w-28 bg-transparent text-right text-sm font-semibold outline-none"
                          value={goal.target}
                          onChange={(v) => updateGoal(goal.id, 'target', String(v))}
                          placeholder="0"
                        />
                        <span className="text-xs text-slate-400">₮</span>
                      </div>
                      <input
                        className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        type="date"
                        value={goal.due}
                        onChange={(e) => updateGoal(goal.id, 'due', e.target.value)}
                      />
                      <div className="flex items-center gap-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-2 transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                        <span className="text-xs font-semibold text-emerald-600">💰 Энэ сарын</span>
                        <NumberInput
                          className="w-24 bg-transparent text-right text-sm font-semibold outline-none"
                          value={goal.saved ?? 0}
                          onChange={(v) => updateGoalSaved(goal.id, String(v))}
                          placeholder="0"
                        />
                        <span className="text-xs text-slate-400">₮</span>
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
        </section>
        )}

        {/* ── ЗЭЭЛ tab ── */}
        {activeTab === 'loan' && (
        <section className="grid gap-6 lg:grid-cols-1 items-start">
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
              {loans.length === 0 && (
                <p className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                  + Нэмэх товч дарж зээл нэмнэ үү
                </p>
              )}
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
                      <div className="flex w-full items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 sm:w-52 transition focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-100">
                        <span className="text-sm font-semibold text-rose-600">₮</span>
                        <NumberInput
                          className="w-full bg-transparent text-right text-sm font-semibold outline-none"
                          value={loan.amount}
                          onChange={(v) => updateLoan(loan.id, 'amount', String(v))}
                          placeholder="0"
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
                      <div className="flex items-center gap-2 rounded-lg border-2 border-rose-200 bg-rose-50 px-3 py-2 transition focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-100">
                        <span className="text-xs font-semibold text-rose-600">💸 Сар бүр</span>
                        <NumberInput
                          className="w-24 bg-transparent text-right text-sm font-semibold outline-none"
                          value={loan.monthlyPayment ?? 0}
                          onChange={(v) => updateLoan(loan.id, 'monthlyPayment', String(v))}
                          placeholder="0"
                        />
                        <span className="text-xs text-slate-400">₮</span>
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
        )}

        {/* ── ХАДГАЛАМЖ tab ── */}
        {activeTab === 'savings' && (
        <section className="grid gap-6 lg:grid-cols-1">
          <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-6 shadow-lg ring-1 ring-slate-200/50">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏦</span>
                <h2 className="text-xl font-bold text-slate-900">Хадгаламж</h2>
                <span className="text-sm text-slate-500">
                  (Нийт: {savingsTotal.toLocaleString()}₮ · Сарын хүү: {savingsInterestMonthly.toLocaleString(undefined, {maximumFractionDigits: 0})}₮)
                </span>
              </div>
              <button
                className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:-translate-y-0.5"
                type="button"
                onClick={addSavings}
              >
                + Нэмэх
              </button>
            </div>
            <div className="space-y-4">
              {savings.length === 0 && (
                <p className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                  + Нэмэх товч дарж хадгаламж нэмнэ үү
                </p>
              )}
              {savings.map((item) => {
                const monthlyInterest = calculateMonthlyInterest(item.amount, item.interestRate);
                const accumulated = Math.round(item.amount + monthlyInterest + (item.depositPaid ? item.monthlyDeposit : 0));
                return (
                  <div key={item.id} className="group rounded-xl border-2 border-slate-200 bg-gradient-to-r from-white to-green-50/30 p-4 transition hover:border-green-300 hover:shadow-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <input
                        className="flex-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                        placeholder="Хадгаламжийн нэр (Хаан банк, Голомт гэх мэт)"
                        value={item.name}
                        onChange={(e) => updateSavings(item.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-green-600">💰 Нийт үлдэгдэл</label>
                        <div className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 transition focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100">
                          <span className="text-xs font-semibold text-green-600">₮</span>
                          <NumberInput
                            className="w-full bg-transparent text-right text-sm font-semibold outline-none"
                            value={item.amount}
                            onChange={(v) => updateSavings(item.id, 'amount', String(v))}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-emerald-600">➕ Сарын хуримтлал</label>
                        <div className="flex items-center gap-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-2 transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                          <span className="text-xs font-semibold text-emerald-600">₮</span>
                          <NumberInput
                            className="w-full bg-transparent text-right text-sm font-semibold outline-none"
                            value={item.monthlyDeposit}
                            onChange={(v) => updateSavings(item.id, 'monthlyDeposit', String(v))}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-green-600">📈 Жилийн хүү %</label>
                        <div className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 transition focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100">
                          <NumberInput
                            className="w-full bg-transparent text-right text-sm font-semibold outline-none"
                            value={item.interestRate}
                            onChange={(v) => updateSavings(item.id, 'interestRate', String(v))}
                            placeholder="0"
                            allowDecimal
                          />
                          <span className="text-sm font-semibold text-green-600">%</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-green-600">📅 Хүү орох өдөр</label>
                        <div className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 transition focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100">
                          <NumberInput
                            className="w-full bg-transparent text-center text-sm font-semibold outline-none"
                            value={item.interestDay}
                            onChange={(v) => updateSavings(item.id, 'interestDay', String(Math.min(31, Math.max(1, v))))}
                            placeholder="1"
                          />
                          <span className="text-xs text-slate-500">-ны өдөр</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-teal-600">💵 Энэ сарын хүү</label>
                        <div className="rounded-lg border-2 border-teal-200 bg-teal-50 px-3 py-2 text-center">
                          <span className="text-sm font-bold text-teal-700">
                            {monthlyInterest.toLocaleString(undefined, {maximumFractionDigits: 0})}₮
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 cursor-pointer transition hover:bg-emerald-200">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={item.depositPaid}
                          onChange={(e) => toggleSavingsDepositPaid(item.id, e.target.checked)}
                        />
                        ✅ Сарын хуримтлал хийгдсэн
                      </label>
                      {item.depositPaid && (
                        <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-md">
                          <span>🏦</span>
                          <span>Энэ сарын цугларсан:</span>
                          <span>{accumulated.toLocaleString()}₮</span>
                        </div>
                      )}
                      {!item.depositPaid && item.monthlyDeposit > 0 && (
                        <span className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 border border-amber-200">
                          ⏳ Хуримтлал хийгдээгүй — {item.monthlyDeposit.toLocaleString()}₮
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        💡 Сар бүр <span className="font-semibold text-green-600">{item.interestDay}</span>-ны өдөр хүү тооцогдоно
                        {item.depositPaid && (
                          <span> · Дараа сарын үлдэгдэл: <span className="font-semibold text-green-600">{accumulated.toLocaleString()}₮</span></span>
                        )}
                      </p>
                      <button
                        className="rounded-lg border-2 border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                        type="button"
                        onClick={() => removeSavings(item.id)}
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
        )}

        </div>{/* end tab content */}

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
