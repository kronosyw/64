import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-paper text-ink">로그인 준비 중...</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
