"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, PageHeader, Panel, TableShell, TextInput, TextSelect } from "@/components/ui";

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
      setEmployees(
        eData.employees.filter((e: Employee) => e.status === "ACTIVE" && e.role !== "OWNER" && e.role !== "SUPERADMIN"),
      );
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
    <div className="space-y-6">
      <PageHeader
        title="근태"
        actions={
          <TextSelect className="w-auto" value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value))}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </TextSelect>
        }
      />

      <Panel>
        <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-3">
          <TextSelect
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
          </TextSelect>
          <TextInput
            type="date"
            value={form.attendanceDate}
            onChange={(e) => setForm({ ...form, attendanceDate: e.target.value })}
          />
          <TextInput
            type="time"
            value={form.actualStartTime}
            onChange={(e) => setForm({ ...form, actualStartTime: e.target.value })}
          />
          <TextInput
            type="time"
            value={form.actualEndTime}
            onChange={(e) => setForm({ ...form, actualEndTime: e.target.value })}
          />
          <Button type="submit" className="sm:col-span-2">
            저장
          </Button>
        </form>
      </Panel>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-muted">
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
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-2 font-mono">{String(r.attendanceDate).slice(0, 10)}</td>
                <td className="px-3 py-2">{r.employeeName}</td>
                <td className="px-3 py-2 font-mono">{r.actualStartTime}</td>
                <td className="px-3 py-2 font-mono">{r.actualEndTime}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2 font-mono">{r.lateMinutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
