"use client";

import { useEffect, useState } from "react";
import { Badge, Button, PageHeader, Panel, TableShell, TextInput, TextSelect } from "@/components/ui";
import { categoryLabel, maskSsn, toDateInput } from "@/lib/hr";

type Branch = { id: number; name: string };
type PayrollItem = {
  id: number;
  employeeName: string;
  employeeCategory: string;
  ssn: string | null;
  hireDate: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  monthlySalary: number | null;
  actualHours: string | number;
  workDays: number;
  basePay: number;
  overtimePay: number;
  totalPay: number;
  taxAmount: number;
  netPay: number;
};
type Payroll = {
  id: number;
  year: number;
  month: number;
  status: string;
  taxType: string;
  branch?: { name: string };
  _count?: { items: number };
  items?: PayrollItem[];
};

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadLedger(payroll: Payroll) {
  if (!payroll.items?.length) return;
  const headers = [
    "연",
    "월",
    "지점",
    "이름",
    "근무형태",
    "주민등록번호",
    "입사일",
    "은행",
    "계좌번호",
    "예금주",
    "기준급여",
    "근무일",
    "시간",
    "기본급",
    "연장",
    "총지급",
    "공제",
    "실지급",
  ];
  const rows = payroll.items.map((i) =>
    [
      payroll.year,
      payroll.month,
      payroll.branch?.name ?? "",
      i.employeeName,
      categoryLabel(i.employeeCategory),
      i.ssn ?? "",
      toDateInput(i.hireDate),
      i.bankName ?? "",
      i.accountNumber ?? "",
      i.accountHolder ?? "",
      i.monthlySalary ?? "",
      i.workDays,
      i.actualHours,
      i.basePay,
      i.overtimePay,
      i.totalPay,
      i.taxAmount,
      i.netPay,
    ]
      .map(csvEscape)
      .join(","),
  );
  const bom = "\uFEFF";
  const blob = new Blob([bom + [headers.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `급여대장_${payroll.year}-${String(payroll.month).padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
        description="직원정보의 근무형태·주민번호·계좌가 명세서와 세무사 전달용 대장에 들어갑니다."
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
                  <Button type="button" variant="link" size="sm" onClick={() => openPayroll(p.id)}>
                    보기
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      {selected?.items ? (
        <TableShell>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
            <div className="font-semibold text-ink">
              {selected.year}-{selected.month} 상세
              {selected.branch?.name ? ` · ${selected.branch.name}` : ""}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => downloadLedger(selected)}>
              세무사 급여대장 CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-paper text-left text-muted">
                <tr>
                  <th className="px-3 py-2">이름</th>
                  <th className="px-3 py-2">근무형태</th>
                  <th className="px-3 py-2">주민번호</th>
                  <th className="px-3 py-2">계좌</th>
                  <th className="px-3 py-2">시간</th>
                  <th className="px-3 py-2">총지급</th>
                  <th className="px-3 py-2">공제</th>
                  <th className="px-3 py-2">실지급</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((i) => (
                  <tr key={i.id} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">{i.employeeName}</td>
                    <td className="px-3 py-2">
                      <Badge tone={i.employeeCategory === "BUSINESS_INCOME_33" ? "gold" : "ink"}>
                        {categoryLabel(i.employeeCategory)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{maskSsn(i.ssn)}</td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {i.bankName || i.accountNumber
                        ? `${i.bankName ?? ""} ${i.accountNumber ?? ""}`.trim()
                        : "미등록"}
                    </td>
                    <td className="px-3 py-2 font-mono">{String(i.actualHours)}</td>
                    <td className="px-3 py-2 font-mono">{i.totalPay.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono">{i.taxAmount.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono font-medium text-ink">{i.netPay.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TableShell>
      ) : null}
    </div>
  );
}
