"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Message,
  PageHeader,
  Panel,
  TableShell,
  TextInput,
  TextSelect,
} from "@/components/ui";
import { categoryLabel, maskSsn, payrollStatusLabel, toDateInput } from "@/lib/hr";

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
  overtimeHours: string | number;
  workDays: number;
  offDays: number;
  basePay: number;
  overtimePay: number;
  totalPay: number;
  taxAmount: number;
  netPay: number;
  isHired: boolean;
  isRetired: boolean;
  itemNotes: string | null;
};
type Payroll = {
  id: number;
  year: number;
  month: number;
  status: string;
  taxType: string;
  memo: string | null;
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
    "초과",
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
      i.overtimeHours,
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

function SectionTable({
  title,
  tone,
  items,
  showDisplay,
}: {
  title: string;
  tone: string;
  items: PayrollItem[];
  showDisplay: "PRE_TAX" | "POST_TAX";
}) {
  const total = items.reduce((sum, i) => sum + (showDisplay === "PRE_TAX" ? i.totalPay : i.netPay), 0);
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-card print:break-inside-avoid">
      <div className={`border-b border-line px-3 py-2 text-sm font-semibold ${tone}`}>{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-paper text-left text-muted">
            <tr>
              <th className="px-3 py-2">NO</th>
              <th className="px-3 py-2">성함</th>
              <th className="px-3 py-2">주민번호</th>
              <th className="px-3 py-2">입사일</th>
              <th className="px-3 py-2">기준급여</th>
              <th className="px-3 py-2">근무/휴무</th>
              <th className="px-3 py-2">시간</th>
              <th className="px-3 py-2">{showDisplay === "PRE_TAX" ? "세전" : "세후"}</th>
              <th className="px-3 py-2">공제</th>
              <th className="px-3 py-2 no-print">계좌</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={i.id} className="border-t border-line">
                <td className="px-3 py-2 font-mono">{idx + 1}</td>
                <td className="px-3 py-2 font-medium">
                  <span className="inline-flex flex-wrap items-center gap-1">
                    {i.employeeName}
                    {i.isRetired ? <Badge tone="danger">퇴사</Badge> : null}
                    {i.isHired ? <Badge tone="gold">입사</Badge> : null}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{maskSsn(i.ssn)}</td>
                <td className="px-3 py-2 font-mono text-xs">{toDateInput(i.hireDate) || "-"}</td>
                <td className="px-3 py-2 font-mono">{(i.monthlySalary ?? 0).toLocaleString()}</td>
                <td className="px-3 py-2 font-mono">
                  {i.workDays}/{i.offDays}
                </td>
                <td className="px-3 py-2 font-mono">{String(i.actualHours)}</td>
                <td className="px-3 py-2 font-mono font-medium">
                  {(showDisplay === "PRE_TAX" ? i.totalPay : i.netPay).toLocaleString()}
                </td>
                <td className="px-3 py-2 font-mono">{i.taxAmount.toLocaleString()}</td>
                <td className="px-3 py-2 text-xs text-muted no-print">
                  {i.bankName || i.accountNumber
                    ? `${i.bankName ?? ""} ${i.accountNumber ?? ""}`.trim()
                    : "미등록"}
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-muted">
                  해당 인원이 없습니다.
                </td>
              </tr>
            ) : null}
            {items.length ? (
              <tr className="border-t border-line bg-paper/60 font-semibold">
                <td className="px-3 py-2" colSpan={7}>
                  합계
                </td>
                <td className="px-3 py-2 font-mono">{total.toLocaleString()}</td>
                <td className="px-3 py-2 font-mono">
                  {items.reduce((s, i) => s + i.taxAmount, 0).toLocaleString()}
                </td>
                <td className="no-print" />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [list, setList] = useState<Payroll[]>([]);
  const [selected, setSelected] = useState<Payroll | null>(null);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1);
  const [taxType, setTaxType] = useState<"PRE_TAX" | "POST_TAX">("PRE_TAX");
  const [message, setMessage] = useState("");

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
    setMessage("");
    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, year, month, taxType }),
    });
    const data = await res.json();
    if (data.success) {
      setSelected(data.payroll);
      setTaxType(data.payroll.taxType || "PRE_TAX");
      setMessage("급여대장을 생성/갱신했습니다.");
      loadList(branchId);
    } else {
      setMessage(data.message || "생성에 실패했습니다.");
    }
  }

  async function openPayroll(id: number) {
    const res = await fetch(`/api/payroll?id=${id}`);
    const data = await res.json();
    if (data.success) {
      setSelected(data.payroll);
      setTaxType(data.payroll.taxType || "PRE_TAX");
    }
  }

  async function updateStatus(status: string) {
    if (!selected) return;
    const res = await fetch("/api/payroll", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, status, taxType }),
    });
    const data = await res.json();
    if (data.success) {
      setSelected(data.payroll);
      if (branchId) loadList(branchId);
      setMessage(`상태를 ${payrollStatusLabel(status)}(으)로 바꿨습니다.`);
    } else {
      setMessage(data.message || "상태 변경 실패");
    }
  }

  async function removePayroll(id: number) {
    if (!confirm("이 급여대장을 삭제할까요? 항목도 함께 삭제됩니다.")) return;
    const res = await fetch(`/api/payroll?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) {
      setMessage(data.message || "삭제 실패");
      return;
    }
    if (selected?.id === id) setSelected(null);
    if (branchId) loadList(branchId);
    setMessage("급여대장을 삭제했습니다.");
  }

  function printPayroll() {
    window.print();
  }

  const grouped = useMemo(() => {
    const items = selected?.items ?? [];
    return {
      four: items.filter((i) => i.employeeCategory === "FULL_TIME_4INS"),
      three: items.filter((i) => i.employeeCategory === "BUSINESS_INCOME_33"),
      daily: items.filter((i) => i.employeeCategory === "DAILY"),
    };
  }, [selected]);

  return (
    <div className="space-y-6">
      <div className="no-print space-y-6">
        <PageHeader
          title="급여대장"
          description="스케줄 집계·4대보험/3.3% 계산 후 인쇄·CSV로 세무사에게 전달합니다."
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
          <TextSelect
            className="w-auto"
            value={taxType}
            onChange={(e) => setTaxType(e.target.value as "PRE_TAX" | "POST_TAX")}
          >
            <option value="PRE_TAX">세전</option>
            <option value="POST_TAX">세후</option>
          </TextSelect>
          <Button type="button" onClick={createPayroll}>
            생성/갱신
          </Button>
        </Panel>

        {message ? <Message tone="ok">{message}</Message> : null}

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
                  <td className="px-3 py-2">{payrollStatusLabel(p.status)}</td>
                  <td className="px-3 py-2 font-mono">{p._count?.items ?? 0}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="link" size="sm" onClick={() => openPayroll(p.id)}>
                        보기
                      </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => removePayroll(p.id)}>
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </div>

      {selected?.items ? (
        <div className="space-y-4">
          <div className="no-print flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {selected.year}년 {selected.month}월 · {selected.branch?.name ?? ""}
              </h2>
              <p className="text-sm text-muted">상태 {payrollStatusLabel(selected.status)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => updateStatus("DRAFT")}>
                작성중
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => updateStatus("DONE")}>
                완료
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => updateStatus("PAID")}>
                지급완료
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => downloadLedger(selected)}>
                CSV
              </Button>
              <Button type="button" size="sm" onClick={printPayroll}>
                A4 인쇄
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={() => removePayroll(selected.id)}>
                삭제
              </Button>
            </div>
          </div>

          <div className="print-only mb-4 hidden print:block">
            <h1 className="border-y border-ink py-2 text-center text-xl font-bold">
              육식사관학교 {selected.branch?.name ?? ""} {selected.month}월 인건비 현황
            </h1>
          </div>

          <SectionTable
            title="1. 정직원 (4대보험)"
            tone="bg-[#e8f0fe] text-ink"
            items={grouped.four}
            showDisplay={taxType}
          />
          <SectionTable
            title="2. 사업소득자 (3.3%)"
            tone="bg-[#fef9c3] text-ink"
            items={grouped.three}
            showDisplay={taxType}
          />
          <SectionTable
            title="3. 일용직"
            tone="bg-[#ffedd5] text-ink"
            items={grouped.daily}
            showDisplay={taxType}
          />
        </div>
      ) : null}
    </div>
  );
}
