"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Message, PageHeader, Panel, TableShell, TextInput, TextSelect } from "@/components/ui";

type Branch = { id: number; name: string };
type Employee = {
  id: number;
  name: string;
  role: string;
  roleLabel: string;
  loginId: string;
  status: string;
  branch?: { id: number; name: string } | null;
  ownerBranches?: { branch: Branch }[];
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState({
    name: "",
    loginId: "",
    password: "",
    role: "STAFF",
    branchId: "",
    ownerBranchIds: [] as number[],
  });
  const [message, setMessage] = useState("");
  const [actorRole, setActorRole] = useState("");

  async function load() {
    const [eRes, bRes] = await Promise.all([fetch("/api/employees"), fetch("/api/branches")]);
    const eData = await eRes.json();
    const bData = await bRes.json();
    if (eData.success) {
      setEmployees(eData.employees);
      if (eData.actorRole) setActorRole(eData.actorRole);
    }
    if (bData.success) {
      setBranches(bData.branches);
      if (!form.branchId && bData.branches[0]) {
        setForm((f) => ({ ...f, branchId: String(bData.branches[0].id) }));
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        branchId: form.role === "OWNER" || form.role === "SUPERADMIN" ? null : Number(form.branchId),
        ownerBranchIds: form.role === "OWNER" ? form.ownerBranchIds : [],
      }),
    });
    const data = await res.json();
    setMessage(data.message || (data.success ? "등록됨" : "실패"));
    if (data.success) {
      setForm({
        name: "",
        loginId: "",
        password: "",
        role: "STAFF",
        branchId: branches[0] ? String(branches[0].id) : "",
        ownerBranchIds: [],
      });
      load();
    }
  }

  function toggleOwnerBranch(id: number) {
    setForm((f) => ({
      ...f,
      ownerBranchIds: f.ownerBranchIds.includes(id)
        ? f.ownerBranchIds.filter((x) => x !== id)
        : [...f.ownerBranchIds, id],
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="직원 관리" />

      <Panel>
        <form onSubmit={onSubmit} className="space-y-3">
          <h2 className="font-semibold text-ink">계정 등록</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <TextInput
              placeholder="이름"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <TextSelect value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {actorRole === "SUPERADMIN" ? <option value="SUPERADMIN">최고관리자</option> : null}
              <option value="OWNER">사장</option>
              <option value="MANAGER">지점장</option>
              <option value="STAFF">직원</option>
              <option value="PARTTIME">파트타임</option>
            </TextSelect>
            <TextInput
              placeholder="로그인 아이디"
              value={form.loginId}
              onChange={(e) => setForm({ ...form, loginId: e.target.value })}
              required
            />
            <TextInput
              placeholder="초기 비밀번호"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {form.role === "SUPERADMIN" ? (
            <p className="text-sm text-muted">최고관리자는 모든 지점의 일정, 직원, 근태, 급여, 광고를 봅니다.</p>
          ) : form.role === "OWNER" ? (
            <div className="flex flex-wrap gap-2">
              {branches.map((b) => (
                <label key={b.id} className="flex items-center gap-1 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={form.ownerBranchIds.includes(b.id)}
                    onChange={() => toggleOwnerBranch(b.id)}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          ) : (
            <TextSelect value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </TextSelect>
          )}

          <Button type="submit">등록</Button>
          {message ? <Message>{message}</Message> : null}
        </form>
      </Panel>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-muted">
            <tr>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">등급</th>
              <th className="px-3 py-2">아이디</th>
              <th className="px-3 py-2">지점</th>
              <th className="px-3 py-2">상태</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="px-3 py-2">{e.name}</td>
                <td className="px-3 py-2">{e.roleLabel}</td>
                <td className="px-3 py-2 font-mono">{e.loginId}</td>
                <td className="px-3 py-2">
                  {e.role === "SUPERADMIN"
                    ? "전체"
                    : e.role === "OWNER"
                      ? e.ownerBranches?.map((ob) => ob.branch.name).join(", ")
                      : e.branch?.name}
                </td>
                <td className="px-3 py-2">{e.status === "ACTIVE" ? "근무" : "퇴사"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
