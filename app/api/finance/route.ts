import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';

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

type Loan = {
  title: string;
  amount: number;
  due: string; // ISO date string
  paid?: boolean;
  recurring?: boolean;
  monthlyPayment?: number; // сар бүрийн төлбөр
};

type FinanceDoc = {
  userId: string;
  month: string; // format YYYY-MM
  income: Income;
  expenses: Expense[];
  goals: Goal[];
  loans: Loan[];
  updatedAt: Date;
};

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Нэвтрэх шаардлагатай' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json({ error: 'month is required (YYYY-MM)' }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection<FinanceDoc>('finance_months');
    try {
      // Remove legacy unique index on month to allow per-user data.
      await collection.dropIndex('month_1');
    } catch (dropErr) {
      // Ignore if the index does not exist or cannot be dropped.
      console.error('Finance index drop error (month_1):', dropErr);
    }
    try {
      await collection.createIndex(
        { userId: 1, month: 1 },
        {
          unique: true,
          name: 'userId_month_unique',
          partialFilterExpression: { userId: { $exists: true, $type: 'string' } },
        },
      );
    } catch (indexErr) {
      console.error('Finance index create error:', indexErr);
    }

    const doc = await collection.findOne({ userId: user.userId, month });
    let fallback: FinanceDoc = {
      userId: user.userId,
      month,
      income: { husband: 0, wife: 0 },
      expenses: [],
      goals: [],
      loans: [],
      updatedAt: new Date(),
    };

    // If no data for this month, prefill from latest previous month where items are recurring
    if (!doc) {
      const prev = await collection
        .find({ userId: user.userId, month: { $lt: month } })
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
          loans: (prev[0].loans ?? [])
            .filter((l) => l.recurring)
            .map((l) => ({ ...l, paid: false })),
        };
      }
    }

    return NextResponse.json(doc ?? fallback);
  } catch (err) {
    console.error('Finance GET error:', err);
    return NextResponse.json(
      { error: 'Серверийн алдаа. Дараа дахин оролдоно уу.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Нэвтрэх шаардлагатай' }, { status: 401 });
    }

    const body = await request.json();
    const { month, income, expenses, goals, loans } = body ?? {};

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

    const safeLoans: Loan[] = Array.isArray(loans)
      ? loans
          .map((l: any) => ({
            title: typeof l?.title === 'string' ? l.title.trim() : '',
            amount: Number(l?.amount ?? 0) || 0,
            due: typeof l?.due === 'string' ? l.due : '',
            paid: Boolean(l?.paid),
            recurring: Boolean(l?.recurring),
            monthlyPayment: Number(l?.monthlyPayment ?? 0) || 0,
          }))
          .filter((l) => l.title)
      : [];

    const doc: FinanceDoc = {
      userId: user.userId,
      month,
      income: safeIncome,
      expenses: safeExpenses,
      goals: safeGoals,
      loans: safeLoans,
      updatedAt: new Date(),
    };

    const db = await getDb();
    const collection = db.collection<FinanceDoc>('finance_months');
    try {
      // Remove legacy unique index on month to allow per-user data.
      await collection.dropIndex('month_1');
    } catch (dropErr) {
      // Ignore if the index does not exist or cannot be dropped.
      console.error('Finance index drop error (month_1):', dropErr);
    }
    try {
      await collection.createIndex(
        { userId: 1, month: 1 },
        {
          unique: true,
          name: 'userId_month_unique',
          partialFilterExpression: { userId: { $exists: true, $type: 'string' } },
        },
      );
    } catch (indexErr) {
      console.error('Finance index create error:', indexErr);
    }

    await collection.updateOne({ userId: user.userId, month }, { $set: doc }, { upsert: true });

    return NextResponse.json(doc, { status: 201 });
  } catch (err: any) {
    console.error('Finance POST error:', err);
    const message = typeof err?.message === 'string' ? err.message : 'Серверийн алдаа. Дараа дахин оролдоно уу.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
