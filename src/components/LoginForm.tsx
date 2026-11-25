"use client";

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
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md overflow-hidden rounded-panel border border-line bg-card shadow-[0_18px_50px_rgba(12,35,64,0.12)]">
        <div className="flex flex-col items-center bg-ink px-6 py-9 text-center text-paper">
          <BrandMark size={56} />
          <h1 className="mt-3 text-2xl font-bold tracking-tight">잉잉관리자</h1>
          <p className="mt-1 text-sm text-paper/70">일정 · 근태 · 지점 관리</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 p-6">
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
        </form>
      </div>
    </div>
  );
}
