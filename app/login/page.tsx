import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const redirectParam = searchParams?.from;
  const redirectTo = Array.isArray(redirectParam)
    ? redirectParam[0]
    : redirectParam;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <LoginForm redirectTo={redirectTo} />
    </main>
  );
}
