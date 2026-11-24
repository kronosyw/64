"use client";

import { FormEvent, useEffect, useState } from "react";

type Branch = {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState({ name: "", code: "", address: "", phone: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/branches");
    const data = await res.json();
    if (data.success) setBranches(data.branches);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setMessage(data.message || (data.success ? "등록됨" : "실패"));
    if (data.success) {
      setForm({ name: "", code: "", address: "", phone: "" });
      load();
    }
  }

  async function deactivate(id: number) {
    if (!confirm("비활성화할까요?")) return;
    await fetch(`/api/branches?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <a href="/" className="text-sm text-blue-700">
          ← 일정으로
        </a>
        <h1 className="mt-2 text-2xl font-bold">지점 관리</h1>
      </div>

      <form onSubmit={onSubmit} className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-semibold">지점 등록</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-md border px-3 py-2"
            placeholder="지점명"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="rounded-md border px-3 py-2"
            placeholder="코드"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <input
            className="rounded-md border px-3 py-2"
            placeholder="주소"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            className="rounded-md border px-3 py-2"
            placeholder="전화"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <button type="submit" className="rounded-md bg-blue-700 px-3 py-2 text-sm text-white">
          등록
        </button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </form>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">코드</th>
              <th className="px-3 py-2">전화</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-3 py-2">{b.name}</td>
                <td className="px-3 py-2">{b.code}</td>
                <td className="px-3 py-2">{b.phone}</td>
                <td className="px-3 py-2">{b.isActive ? "활성" : "비활성"}</td>
                <td className="px-3 py-2 text-right">
                  {b.isActive ? (
                    <button type="button" className="text-red-600" onClick={() => deactivate(b.id)}>
                      비활성
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
