"use client";

import { FormEvent, useEffect, useState } from "react";

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

  async function load() {
    const [eRes, bRes] = await Promise.all([fetch("/api/employees"), fetch("/api/branches")]);
    const eData = await eRes.json();
    const bData = await bRes.json();
    if (eData.success) setEmployees(eData.employees);
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
        branchId: form.role === "OWNER" ? null : Number(form.branchId),
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
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <a href="/" className="text-sm text-blue-700">
          ← 일정으로
        </a>
        <h1 className="mt-2 text-2xl font-bold">직원 관리</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="font-semibold">계정 등록</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-md border px-3 py-2"
            placeholder="이름"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <select
            className="rounded-md border px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="OWNER">사장</option>
            <option value="MANAGER">지점장</option>
            <option value="STAFF">직원</option>
            <option value="PARTTIME">파트타임</option>
          </select>
          <input
            className="rounded-md border px-3 py-2"
            placeholder="로그인 아이디"
            value={form.loginId}
            onChange={(e) => setForm({ ...form, loginId: e.target.value })}
            required
          />
          <input
            className="rounded-md border px-3 py-2"
            placeholder="초기 비밀번호"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        {form.role === "OWNER" ? (
          <div className="flex flex-wrap gap-2">
            {branches.map((b) => (
              <label key={b.id} className="flex items-center gap-1 text-sm">
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
          <select
            className="rounded-md border px-3 py-2"
            value={form.branchId}
            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <button type="submit" className="rounded-md bg-blue-700 px-3 py-2 text-sm text-white">
          등록
        </button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </form>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
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
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2">{e.name}</td>
                <td className="px-3 py-2">{e.roleLabel}</td>
                <td className="px-3 py-2">{e.loginId}</td>
                <td className="px-3 py-2">
                  {e.role === "OWNER"
                    ? e.ownerBranches?.map((ob) => ob.branch.name).join(", ")
                    : e.branch?.name}
                </td>
                <td className="px-3 py-2">{e.status === "ACTIVE" ? "근무" : "퇴사"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
