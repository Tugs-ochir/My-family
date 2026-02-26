import { NextResponse } from 'next/server';
import { getDb, ensureIndexes } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';

type IncomeMember = {
  name: string;
  salary: number;
};

type Income = {
  members: IncomeMember[];
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

type Savings = {
  name: string;
  amount: number; // Нийт үлдэгдэл
  monthlyDeposit: number; // Энэ сард нэмэх дүн
  depositPaid: boolean; // Сарын хуримтлал хийгдсэн эсэх
  interestRate: number; // Жилийн хүү %
  interestDay: number; // Сарын хэдэнд хүү ордог (1-31)
};

type FinanceDoc = {
  userId: string;
  month: string; // format YYYY-MM
  income: Income;
  expenses: Expense[];
  goals: Goal[];
  loans: Loan[];
  savings: Savings[];
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

    await ensureIndexes();
    const db = await getDb();
    const collection = db.collection<FinanceDoc>('finance_months');

    const doc = await collection.findOne({ userId: user.userId, month });

    // Өмнөх сарын хадгаламжийг хүүтэй нь шилжүүлэх helper
    const carryOverSavings = (prevSavings: Savings[]): Savings[] =>
      prevSavings.map((s) => {
        const annualRate = s.interestRate ?? 0;
        const monthlyInterest = (s.amount * annualRate) / 100 / 12;
        const deposit = s.depositPaid ? ((s as any).monthlyDeposit ?? 0) : 0;
        return {
          ...s,
          amount: Math.round(s.amount + monthlyInterest + deposit),
          depositPaid: false,
        };
      });

    let fallback: FinanceDoc = {
      userId: user.userId,
      month,
      income: { members: [] },
      expenses: [],
      goals: [],
      loans: [],
      savings: [],
      updatedAt: new Date(),
    };

    // Тухайн сарын doc байхгүй, эсвэл хадгаламж хоосон байвал өмнөх сараас татах
    const needsPrevData = !doc;
    const needsPrevSavings = !needsPrevData && (doc!.savings ?? []).length === 0;

    if (needsPrevData || needsPrevSavings) {
      // Хадгаламжтай хамгийн сүүлийн өмнөх сарыг хайна
      const prevWithSavings = await collection
        .find({ userId: user.userId, month: { $lt: month }, 'savings.0': { $exists: true } })
        .sort({ month: -1 })
        .limit(1)
        .toArray();

      if (needsPrevData) {
        // doc байхгүй бол бүх мэдээллийг өмнөх сараас авна
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
            savings: carryOverSavings(prevWithSavings[0]?.savings ?? prev[0].savings ?? []),
          };
        }
      } else if (needsPrevSavings && prevWithSavings[0]) {
        // doc байгаа ч хадгаламж хоосон — зөвхөн хадгаламжийг нэмнэ
        return NextResponse.json({
          ...doc,
          savings: carryOverSavings(prevWithSavings[0].savings),
        });
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
    const { month, income, expenses, goals, loans, savings } = body ?? {};

    if (!month || typeof month !== 'string') {
      return NextResponse.json({ error: 'month is required (YYYY-MM)' }, { status: 400 });
    }

    // Хуучин { husband, wife } форматыг шинэ members болгон хөрвүүлнэ
    let safeIncome: Income;
    if (Array.isArray(income?.members)) {
      safeIncome = {
        members: income.members
          .map((m: any) => ({
            name: typeof m?.name === 'string' ? m.name.trim() : '',
            salary: Number(m?.salary ?? 0) || 0,
          }))
          .filter((m: IncomeMember) => m.name),
      };
    } else {
      const legacyMembers: IncomeMember[] = [];
      if (Number(income?.husband) > 0) legacyMembers.push({ name: 'Нөхөр', salary: Number(income.husband) });
      if (Number(income?.wife) > 0) legacyMembers.push({ name: 'Эхнэр', salary: Number(income.wife) });
      safeIncome = { members: legacyMembers };
    }

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

    const safeSavings: Savings[] = Array.isArray(savings)
      ? savings
          .map((s: any) => ({
            name: typeof s?.name === 'string' ? s.name.trim() : '',
            amount: Number(s?.amount ?? 0) || 0,
            monthlyDeposit: Number(s?.monthlyDeposit ?? 0) || 0,
            depositPaid: Boolean(s?.depositPaid),
            interestRate: Number(s?.interestRate ?? 0) || 0,
            interestDay: Number(s?.interestDay ?? 1) || 1,
          }))
          .filter((s) => s.name)
      : [];

    const doc: FinanceDoc = {
      userId: user.userId,
      month,
      income: safeIncome,
      expenses: safeExpenses,
      goals: safeGoals,
      loans: safeLoans,
      savings: safeSavings,
      updatedAt: new Date(),
    };

    await ensureIndexes();
    const db = await getDb();
    const collection = db.collection<FinanceDoc>('finance_months');

    await collection.updateOne({ userId: user.userId, month }, { $set: doc }, { upsert: true });

    return NextResponse.json(doc, { status: 201 });
  } catch (err: any) {
    console.error('Finance POST error:', err);
    const message = typeof err?.message === 'string' ? err.message : 'Серверийн алдаа. Дараа дахин оролдоно уу.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
