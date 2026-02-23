import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

type Income = {
  husband: number;
  wife: number;
};

type Expense = {
  label: string;
  amount: number;
  recurring?: boolean;
  paid?: boolean;
};

type Goal = {
  title: string;
  target: number;
  due: string; // ISO date string
  done: boolean;
  recurring?: boolean;
  saved?: number; // planned/saved amount for the month
};

type FinanceDoc = {
  month: string; // format YYYY-MM
  income: Income;
  expenses: Expense[];
  goals: Goal[];
  updatedAt: Date;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  if (!month) {
    return NextResponse.json({ error: 'month is required (YYYY-MM)' }, { status: 400 });
  }

  const db = await getDb();
  const collection = db.collection<FinanceDoc>('finance_months');
  await collection.createIndex({ month: 1 }, { unique: true });

  const doc = await collection.findOne({ month });
  let fallback: FinanceDoc = {
    month,
    income: { husband: 0, wife: 0 },
    expenses: [],
    goals: [],
    updatedAt: new Date(),
  };

  // If no data for this month, prefill from latest previous month where items are recurring
  if (!doc) {
    const prev = await collection
      .find({ month: { $lt: month } })
      .sort({ month: -1 })
      .limit(1)
      .toArray();
    if (prev[0]) {
      fallback = {
        ...fallback,
        income: prev[0].income,
        expenses: (prev[0].expenses ?? [])
          .filter((e) => e.recurring)
          .map((e) => ({ ...e, paid: false })),
        goals: (prev[0].goals ?? [])
          .filter((g) => g.recurring)
          .map((g) => ({ ...g, done: false })),
      };
    }
  }

  return NextResponse.json(doc ?? fallback);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { month, income, expenses, goals } = body ?? {};

  if (!month || typeof month !== 'string') {
    return NextResponse.json({ error: 'month is required (YYYY-MM)' }, { status: 400 });
  }

  const safeIncome: Income = {
    husband: Number(income?.husband ?? 0) || 0,
    wife: Number(income?.wife ?? 0) || 0,
  };

  const safeExpenses: Expense[] = Array.isArray(expenses)
    ? expenses
        .map((e: any) => ({
          label: typeof e?.label === 'string' ? e.label.trim() : '',
          amount: Number(e?.amount ?? 0) || 0,
          recurring: Boolean(e?.recurring),
          paid: Boolean(e?.paid),
        }))
        .filter((e) => e.label)
    : [];

  const safeGoals: Goal[] = Array.isArray(goals)
    ? goals
        .map((g: any) => ({
          title: typeof g?.title === 'string' ? g.title.trim() : '',
          target: Number(g?.target ?? 0) || 0,
          due: typeof g?.due === 'string' ? g.due : '',
          done: Boolean(g?.done),
          recurring: Boolean(g?.recurring),
          saved: Number(g?.saved ?? 0) || 0,
        }))
        .filter((g) => g.title)
    : [];

  const doc: FinanceDoc = {
    month,
    income: safeIncome,
    expenses: safeExpenses,
    goals: safeGoals,
    updatedAt: new Date(),
  };

  const db = await getDb();
  const collection = db.collection<FinanceDoc>('finance_months');
  await collection.createIndex({ month: 1 }, { unique: true });

  await collection.updateOne({ month }, { $set: doc }, { upsert: true });

  return NextResponse.json(doc, { status: 201 });
}
