"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { Button, Field, Message, TextInput } from "@/components/ui";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const requested = searchParams.get("callbackUrl") || "/";
    const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
    try {
      const res = await signIn("credentials", {
        mode: "admin",
        loginId,
        password,
        redirect: false,
      });
      if (!res || res.error || !res.ok) {
        setError("아이디 또는 비밀번호를 확인해주세요.");
        return;
      }
      window.location.assign(next);
    } catch {
      setError("로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(232,163,23,0.14),transparent_42%),radial-gradient(ellipse_at_90%_10%,rgba(26,86,219,0.12),transparent_40%)]"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-panel border border-line bg-card shadow-lift">
        <div className="flex flex-col items-center px-6 pb-2 pt-9 text-center">
          <BrandMark size={56} />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">관리자 로그인</h1>
          <p className="mt-1 text-sm text-muted">사장 · 지점장 · 최고관리자</p>
          <div className="mt-5 h-1 w-16 rounded-full bg-gradient-to-r from-gold to-ink" aria-hidden />
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 pb-8 pt-5">
          <Field label="아이디">
            <TextInput
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field label="비밀번호">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {error ? <Message tone="danger">{error}</Message> : null}
          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? "로그인 중..." : "로그인"}
          </Button>
          <p className="text-center text-sm text-muted">
            직원이신가요?{" "}
            <Link href="/login/staff" className="font-medium text-ink underline-offset-2 hover:underline">
              직원 로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
