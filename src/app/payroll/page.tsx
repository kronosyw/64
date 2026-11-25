"use client";

import { useEffect, useState } from "react";
import { Button, PageHeader, Panel, TableShell, TextInput, TextSelect } from "@/components/ui";

type Branch = { id: number; name: string };
type Payroll = {
  id: number;
  year: number;
  month: number;
  status: string;
  taxType: string;
  _count?: { items: number };
  items?: {
    id: number;
    employeeName: string;
    employeeCategory: string;
    actualHours: string | number;
    totalPay: number;
    taxAmount: number;
    netPay: number;
  }[];
};

export default function PayrollPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [list, setList] = useState<Payroll[]>([]);
  const [selected, setSelected] = useState<Payroll | null>(null);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1);

  async function init() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    const res = await fetch("/api/branches");
    const data = await res.json();
    if (data.success && data.branches.length) {
      setBranches(data.branches);
      setBranchId(data.branches[0].id);
    }
  }

  async function loadList(id: number) {
    const res = await fetch(`/api/payroll?branchId=${id}`);
    const data = await res.json();
    if (data.success) setList(data.payrolls);
  }

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (branchId) loadList(branchId);
  }, [branchId]);

  async function createPayroll() {
    if (!branchId) return;
    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, year, month, taxType: "PRE_TAX" }),
    });
    const data = await res.json();
    if (data.success) {
      setSelected(data.payroll);
      loadList(branchId);
    } else {
      alert(data.message || "실패");
    }
  }

  async function openPayroll(id: number) {
    const res = await fetch(`/api/payroll?id=${id}`);
    const data = await res.json();
    if (data.success) setSelected(data.payroll);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="급여대장"
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

      <Panel className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-ink">
          연
          <TextInput
            type="number"
            className="ml-2 w-24"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>
        <label className="text-sm text-ink">
          월
          <TextInput
            type="number"
            className="ml-2 w-16"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
        </label>
        <Button type="button" onClick={createPayroll}>
          생성/갱신
        </Button>
      </Panel>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-muted">
            <tr>
              <th className="px-3 py-2">기간</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">인원</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-3 py-2 font-mono">
                  {p.year}-{p.month}
                </td>
                <td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2 font-mono">{p._count?.items ?? 0}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" className="text-ink" onClick={() => openPayroll(p.id)}>
                    보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      {selected?.items ? (
        <TableShell>
          <div className="border-b border-line px-3 py-2 font-semibold text-ink">
            {selected.year}-{selected.month} 상세
          </div>
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-muted">
              <tr>
                <th className="px-3 py-2">이름</th>
                <th className="px-3 py-2">구분</th>
                <th className="px-3 py-2">시간</th>
                <th className="px-3 py-2">총지급</th>
                <th className="px-3 py-2">공제</th>
                <th className="px-3 py-2">실지급</th>
              </tr>
            </thead>
            <tbody>
              {selected.items.map((i) => (
                <tr key={i.id} className="border-t border-line">
                  <td className="px-3 py-2">{i.employeeName}</td>
                  <td className="px-3 py-2">{i.employeeCategory}</td>
                  <td className="px-3 py-2 font-mono">{String(i.actualHours)}</td>
                  <td className="px-3 py-2 font-mono">{i.totalPay.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono">{i.taxAmount.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono">{i.netPay.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      ) : null}
    </div>
  );
}
