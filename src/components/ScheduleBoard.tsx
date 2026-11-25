"use client";

import { useEffect, useMemo, useState } from "react";
import { WORK_TYPE_LABEL, type WorkTypeKey } from "@/lib/roles";

type Schedule = {
  id: number;
  employeeId: number;
  employeeName: string;
  workType: WorkTypeKey;
  workDate: string;
  startTime: string | null;
  endTime: string | null;
};

type Employee = { id: number; name: string; role: string };
type Memo = {
  id: number;
  content: string;
  author: string;
  isImportant: boolean;
  isCompleted: boolean;
  replies: Memo[];
};

export function ScheduleBoard({
  branchId,
  year,
  month,
  canEdit,
  showMemo,
}: {
  branchId: number;
  year: number;
  month: number;
  canEdit: boolean;
  showMemo: boolean;
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [form, setForm] = useState({
    employeeId: "",
    workType: "OPEN",
    workDate: "",
    startTime: "10:00",
    endTime: "22:00",
  });
  const [memoContent, setMemoContent] = useState("");
  const [message, setMessage] = useState("");

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  async function load() {
    const sRes = await fetch(`/api/schedules?branchId=${branchId}&year=${year}&month=${month}`);
    const sData = await sRes.json();
    if (sData.success) setSchedules(sData.schedules);

    if (canEdit) {
      const eRes = await fetch(`/api/employees?branchId=${branchId}`);
      const eData = await eRes.json();
      if (eData.success) {
        setEmployees(
          eData.employees.filter(
            (e: Employee & { status: string }) =>
              e.status === "ACTIVE" && e.role !== "OWNER" && e.role !== "SUPERADMIN",
          ),
        );
      }
    }

    if (showMemo) {
      const mRes = await fetch(`/api/memos?branchId=${branchId}`);
      const mData = await mRes.json();
      if (mData.success) setMemos(mData.memos);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, year, month]);

  async function createSchedule() {
    setMessage("");
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        employeeId: Number(form.employeeId),
        workType: form.workType,
        workDate: form.workDate,
        startTime: form.startTime,
        endTime: form.endTime,
      }),
    });
    const data = await res.json();
    setMessage(data.message || (data.success ? "등록됨" : "실패"));
    if (data.success) load();
  }

  async function removeSchedule(id: number) {
    if (!confirm("삭제할까요?")) return;
    await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
    load();
  }

  async function createMemo() {
    const res = await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, content: memoContent }),
    });
    const data = await res.json();
    if (data.success) {
      setMemoContent("");
      load();
    } else {
      setMessage(data.message || "메모 실패");
    }
  }

  const byDate = useMemo(() => {
    const map = new Map<number, Schedule[]>();
    for (const s of schedules) {
      const d = new Date(s.workDate).getUTCDate();
      const list = map.get(d) || [];
      list.push(s);
      map.set(d, list);
    }
    return map;
  }, [schedules]);

  return (
    <div className="space-y-6">
      {canEdit ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">일정 등록</h2>
          <div className="grid gap-2 sm:grid-cols-5">
            <select
              className="rounded-md border px-2 py-2 text-sm"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            >
              <option value="">직원 선택</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border px-2 py-2 text-sm"
              value={form.workType}
              onChange={(e) => setForm({ ...form, workType: e.target.value })}
            >
              {Object.entries(WORK_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="rounded-md border px-2 py-2 text-sm"
              value={form.workDate}
              onChange={(e) => setForm({ ...form, workDate: e.target.value })}
            />
            <input
              type="time"
              className="rounded-md border px-2 py-2 text-sm"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
            <input
              type="time"
              className="rounded-md border px-2 py-2 text-sm"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>
          <button
            type="button"
            onClick={createSchedule}
            className="mt-3 rounded-md bg-blue-700 px-3 py-2 text-sm text-white"
          >
            등록
          </button>
          {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
          <div key={day} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 text-sm font-semibold">
              {month}/{day}
            </div>
            <div className="space-y-1">
              {(byDate.get(day) || []).map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-xs">
                  <span>
                    {WORK_TYPE_LABEL[s.workType]} · {s.employeeName}
                    {s.workType !== "OFF" && s.startTime ? ` ${s.startTime}-${s.endTime}` : ""}
                  </span>
                  {canEdit ? (
                    <button type="button" className="text-red-500" onClick={() => removeSchedule(s.id)}>
                      삭제
                    </button>
                  ) : null}
                </div>
              ))}
              {(byDate.get(day) || []).length === 0 ? (
                <p className="text-xs text-slate-400">일정 없음</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {showMemo ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">메모</h2>
          <div className="mb-3 flex gap-2">
            <input
              className="flex-1 rounded-md border px-3 py-2 text-sm"
              placeholder="새 메모"
              value={memoContent}
              onChange={(e) => setMemoContent(e.target.value)}
            />
            <button type="button" onClick={createMemo} className="rounded-md bg-amber-600 px-3 py-2 text-sm text-white">
              작성
            </button>
          </div>
          <div className="space-y-2">
            {memos.map((m) => (
              <div key={m.id} className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{m.author}</span>
                  {m.isImportant ? <span className="text-red-600">중요</span> : null}
                </div>
                <p>{m.content}</p>
              </div>
            ))}
            {!memos.length ? <p className="text-sm text-slate-400">등록된 메모가 없습니다.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
