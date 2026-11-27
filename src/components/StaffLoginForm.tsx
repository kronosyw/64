"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { BrandMark } from "@/components/BrandMark";
import { Button, Field, Message, TextInput } from "@/components/ui";

type Branch = { id: number; name: string };

function branchShortLabel(name: string) {
  if (name.includes("송파")) return "송파점";
  if (name.includes("야탑") || name.includes("분당")) return "분당야탑점";
  return name.replace(/^육식사관학교\s*/, "").trim() || name;
}

export function StaffLoginForm() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/public/branches")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.branches?.length) {
          setBranches(data.branches);
          setBranchId(String(data.branches[0].id));
        }
      })
      .catch(() => setError("지점 목록을 불러오지 못했습니다."));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        mode: "staff",
        branchId,
        name,
        password,
        redirect: false,
      });
      if (!res || res.error || !res.ok) {
        setError("지점·이름·비밀번호를 확인해주세요.");
        return;
      }
      window.location.assign("/");
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
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">직원 로그인</h1>
          <p className="mt-1 text-sm text-muted">지점 · 이름 · 비밀번호로 일정을 확인합니다.</p>
          <div className="mt-5 h-1 w-16 rounded-full bg-gradient-to-r from-gold to-ink" aria-hidden />
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 pb-8 pt-5">
          <Field label="지점">
            <div
              className="grid gap-1 rounded-btn border border-line bg-paper p-1"
              style={{ gridTemplateColumns: `repeat(${Math.max(branches.length, 1)}, minmax(0, 1fr))` }}
              role="group"
              aria-label="지점 선택"
            >
              {branches.map((b) => {
                const active = String(b.id) === branchId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    title={b.name}
                    onClick={() => setBranchId(String(b.id))}
                    className={`min-h-9 truncate rounded-[0.45rem] px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/80 ${
                      active ? "bg-ink text-white shadow-sm" : "text-muted hover:bg-card hover:text-foreground"
                    }`}
                  >
                    {branchShortLabel(b.name)}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="이름">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
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
          <Button type="submit" disabled={loading || !branchId} size="lg" className="w-full">
            {loading ? "로그인 중..." : "로그인"}
          </Button>
          <p className="text-center text-sm text-muted">
            관리자이신가요?{" "}
            <Link href="/login" className="font-medium text-ink underline-offset-2 hover:underline">
              관리자 로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
