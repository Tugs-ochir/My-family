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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 px-4">
      <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      <LoginForm redirectTo={redirectTo} />
    </main>
  );
}
