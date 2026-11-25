"use client";

import { FormEvent, useState } from "react";
import { Button, Field, Message, PageHeader, Panel, TextInput } from "@/components/ui";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setOk(Boolean(data.success));
    setMessage(data.message || (data.success ? "변경됨" : "실패"));
    if (data.success) {
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title="설정" description="계정 설정을 여기서 관리합니다." />
      <Panel>
        <form onSubmit={onSubmit} className="space-y-3">
          <h2 className="font-semibold text-ink">비밀번호 변경</h2>
          <Field label="현재 비밀번호">
            <TextInput
              type="password"
              placeholder="현재 비밀번호"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Field>
          <Field label="새 비밀번호">
            <TextInput
              type="password"
              placeholder="새 비밀번호 (6자 이상)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </Field>
          <Button type="submit" size="lg" className="w-full">
            변경
          </Button>
          {message ? <Message tone={ok ? "ok" : "danger"}>{message}</Message> : null}
        </form>
      </Panel>
    </div>
  );
}
