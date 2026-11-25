"use client";

import { useEffect, useState } from "react";
import { PageHeader, Panel, TableShell, TextInput, TextSelect } from "@/components/ui";

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
    <div className="space-y-6">
      <PageHeader
        title="통계"
        actions={
          <div className="flex gap-2">
            <TextSelect className="w-auto" value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value))}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </TextSelect>
            <TextInput
              type="number"
              className="w-24"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
            <TextInput
              type="number"
              className="w-16"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Panel>
          <div className="text-xs text-muted">일정 수</div>
          <div className="font-mono text-2xl font-bold text-ink">{totals.scheduleCount}</div>
        </Panel>
        <Panel>
          <div className="text-xs text-muted">근무 인원</div>
          <div className="font-mono text-2xl font-bold text-ink">{totals.employeeCount}</div>
        </Panel>
        <Panel>
          <div className="text-xs text-muted">총 시간</div>
          <div className="font-mono text-2xl font-bold text-ink">{totals.totalHours.toFixed(1)}</div>
        </Panel>
      </div>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-muted">
            <tr>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">근무일</th>
              <th className="px-3 py-2">휴무일</th>
              <th className="px-3 py-2">시간</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.employeeId} className="border-t border-line">
                <td className="px-3 py-2">{e.name}</td>
                <td className="px-3 py-2 font-mono">{e.workDays}</td>
                <td className="px-3 py-2 font-mono">{e.offDays}</td>
                <td className="px-3 py-2 font-mono">{e.hours.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
