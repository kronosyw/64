"use client";

import { FormEvent, useState } from "react";

export default function PasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setMessage(data.message || (data.success ? "변경됨" : "실패"));
    if (data.success) {
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <a href="/" className="text-sm text-blue-700">
        ← 일정으로
      </a>
      <h1 className="mt-2 mb-4 text-2xl font-bold">비밀번호 변경</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border bg-white p-4">
        <input
          type="password"
          className="w-full rounded-md border px-3 py-2"
          placeholder="현재 비밀번호"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full rounded-md border px-3 py-2"
          placeholder="새 비밀번호"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full rounded-md bg-blue-700 py-2 text-white">
          변경
        </button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </form>
    </div>
  );
}
