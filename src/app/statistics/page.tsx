"use client";

import { useEffect, useState } from "react";

type Branch = { id: number; name: string };
type EmpStat = { employeeId: number; name: string; workDays: number; offDays: number; hours: number };

export default function StatisticsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1);
  const [employees, setEmployees] = useState<EmpStat[]>([]);
  const [totals, setTotals] = useState({ scheduleCount: 0, employeeCount: 0, totalHours: 0 });

  useEffect(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    fetch("/api/branches")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.branches.length) {
          setBranches(data.branches);
          setBranchId(data.branches[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!branchId) return;
    fetch(`/api/statistics?branchId=${branchId}&year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEmployees(data.employees);
          setTotals(data.totals);
        }
      });
  }, [branchId, year, month]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <a href="/" className="text-sm text-blue-700">
            ← 일정으로
          </a>
          <h1 className="mt-2 text-2xl font-bold">통계</h1>
        </div>
        <div className="flex gap-2">
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
          <input
            type="number"
            className="w-24 rounded-md border px-2 py-1.5 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <input
            type="number"
            className="w-16 rounded-md border px-2 py-1.5 text-sm"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-slate-500">일정 수</div>
          <div className="text-2xl font-bold">{totals.scheduleCount}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-slate-500">근무 인원</div>
          <div className="text-2xl font-bold">{totals.employeeCount}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-slate-500">총 시간</div>
          <div className="text-2xl font-bold">{totals.totalHours.toFixed(1)}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">근무일</th>
              <th className="px-3 py-2">휴무일</th>
              <th className="px-3 py-2">시간</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.employeeId} className="border-t">
                <td className="px-3 py-2">{e.name}</td>
                <td className="px-3 py-2">{e.workDays}</td>
                <td className="px-3 py-2">{e.offDays}</td>
                <td className="px-3 py-2">{e.hours.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
