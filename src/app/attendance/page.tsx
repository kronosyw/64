"use client";

import { FormEvent, useEffect, useState } from "react";

type Attendance = {
  id: number;
  employeeName: string;
  attendanceDate: string;
  status: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  lateMinutes: number;
};
type Employee = { id: number; name: string; role: string; status: string };
type Branch = { id: number; name: string };

export default function AttendancePage() {
  const [branchId, setBranchId] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<Attendance[]>([]);
  const [form, setForm] = useState({
    employeeId: "",
    attendanceDate: "",
    scheduledStartTime: "10:00",
    scheduledEndTime: "22:00",
    actualStartTime: "10:00",
    actualEndTime: "22:00",
  });
  const [yearMonth, setYearMonth] = useState({ year: 0, month: 0 });

  async function loadBranches() {
    const res = await fetch("/api/branches");
    const data = await res.json();
    if (data.success && data.branches.length) {
      setBranches(data.branches);
      setBranchId(data.branches[0].id);
    }
  }

  async function load() {
    if (!branchId || !yearMonth.year) return;
    const [aRes, eRes] = await Promise.all([
      fetch(`/api/attendance?branchId=${branchId}&year=${yearMonth.year}&month=${yearMonth.month}`),
      fetch(`/api/employees?branchId=${branchId}`),
    ]);
    const aData = await aRes.json();
    const eData = await eRes.json();
    if (aData.success) setRows(aData.attendances);
    if (eData.success) {
      setEmployees(eData.employees.filter((e: Employee) => e.status === "ACTIVE" && e.role !== "OWNER"));
    }
  }

  useEffect(() => {
    const now = new Date();
    setYearMonth({ year: now.getFullYear(), month: now.getMonth() + 1 });
    setForm((f) => ({ ...f, attendanceDate: now.toISOString().slice(0, 10) }));
    loadBranches();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!branchId) return;
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, branchId, employeeId: Number(form.employeeId) }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <a href="/" className="text-sm text-blue-700">
            ← 일정으로
          </a>
          <h1 className="mt-2 text-2xl font-bold">근태</h1>
        </div>
        <select
          className="rounded-md border px-2 py-1.5 text-sm"
          value={branchId ?? ""}
          onChange={(e) => setBranchId(Number(e.target.value))}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={onSubmit} className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-3">
        <select
          className="rounded-md border px-2 py-2"
          value={form.employeeId}
          onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          required
        >
          <option value="">직원</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="rounded-md border px-2 py-2"
          value={form.attendanceDate}
          onChange={(e) => setForm({ ...form, attendanceDate: e.target.value })}
        />
        <input
          type="time"
          className="rounded-md border px-2 py-2"
          value={form.actualStartTime}
          onChange={(e) => setForm({ ...form, actualStartTime: e.target.value })}
        />
        <input
          type="time"
          className="rounded-md border px-2 py-2"
          value={form.actualEndTime}
          onChange={(e) => setForm({ ...form, actualEndTime: e.target.value })}
        />
        <button type="submit" className="rounded-md bg-blue-700 px-3 py-2 text-white sm:col-span-2">
          저장
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">날짜</th>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">출근</th>
              <th className="px-3 py-2">퇴근</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">지각(분)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{String(r.attendanceDate).slice(0, 10)}</td>
                <td className="px-3 py-2">{r.employeeName}</td>
                <td className="px-3 py-2">{r.actualStartTime}</td>
                <td className="px-3 py-2">{r.actualEndTime}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.lateMinutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
