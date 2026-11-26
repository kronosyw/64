"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Field,
  Message,
  Modal,
  PageHeader,
  TableShell,
  TextInput,
  TextSelect,
} from "@/components/ui";
import { healthCertTone, insuranceLabel, payRateLabel, toDateInput } from "@/lib/hr";
import { canManageEmployeeAccount, isOwnerOrBelow } from "@/lib/roles";

type Branch = { id: number; name: string };
type Employee = {
  id: number;
  name: string;
  role: string;
  roleLabel: string;
  loginId: string;
  status: string;
  phone: string | null;
  ssn: string | null;
  hireDate: string | null;
  healthCertExpire: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  monthlySalary: number | null;
  insuranceType: "FOUR_INSURANCE" | "THREE_POINT_THREE";
  payBasis: "MONTHLY" | "HOURLY";
  workDaysPerWeek: number;
  notes: string | null;
  branch?: { id: number; name: string } | null;
  ownerBranches?: { branch: Branch }[];
};

type FormState = {
  name: string;
  loginId: string;
  password: string;
  role: string;
  branchId: string;
  ownerBranchIds: number[];
  phone: string;
  ssn: string;
  hireDate: string;
  healthCertExpire: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  monthlySalary: string;
  insuranceType: "FOUR_INSURANCE" | "THREE_POINT_THREE";
  payBasis: "MONTHLY" | "HOURLY";
  workDaysPerWeek: "5" | "6";
  notes: string;
  status: string;
};

function isStaffLike(role: string) {
  return role === "STAFF" || role === "PARTTIME";
}

const emptyForm = (branchId = ""): FormState => ({
  name: "",
  loginId: "",
  password: "",
  role: "STAFF",
  branchId,
  ownerBranchIds: [],
  phone: "",
  ssn: "",
  hireDate: "",
  healthCertExpire: "",
  bankName: "",
  accountNumber: "",
  accountHolder: "",
  monthlySalary: "",
  insuranceType: "FOUR_INSURANCE",
  payBasis: "MONTHLY",
  workDaysPerWeek: "5",
  notes: "",
  status: "ACTIVE",
});

function fromEmployee(e: Employee): FormState {
  return {
    name: e.name,
    loginId: e.loginId,
    password: "",
    role: e.role,
    branchId: e.branch?.id ? String(e.branch.id) : "",
    ownerBranchIds: e.ownerBranches?.map((ob) => ob.branch.id) ?? [],
    phone: e.phone ?? "",
    ssn: e.ssn ?? "",
    hireDate: toDateInput(e.hireDate),
    healthCertExpire: toDateInput(e.healthCertExpire),
    bankName: e.bankName ?? "",
    accountNumber: e.accountNumber ?? "",
    accountHolder: e.accountHolder ?? "",
    monthlySalary: e.monthlySalary != null ? String(e.monthlySalary) : "",
    insuranceType: e.insuranceType,
    payBasis: e.payBasis === "HOURLY" ? "HOURLY" : "MONTHLY",
    workDaysPerWeek: e.workDaysPerWeek === 6 ? "6" : "5",
    notes: e.notes ?? "",
    status: e.status,
  };
}

function HrFields({
  form,
  setForm,
  showStatus = false,
}: {
  form: FormState;
  setForm: (next: FormState) => void;
  showStatus?: boolean;
}) {
  const rateLabel = payRateLabel(form.insuranceType, form.payBasis);
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="주민등록번호">
          <TextInput
            placeholder="000000-0000000"
            value={form.ssn}
            onChange={(e) => setForm({ ...form, ssn: e.target.value })}
          />
        </Field>
        <Field label="근무형태 (급여)">
          <TextSelect
            value={form.insuranceType}
            onChange={(e) => {
              const insuranceType = e.target.value as FormState["insuranceType"];
              setForm({
                ...form,
                insuranceType,
                payBasis:
                  insuranceType === "FOUR_INSURANCE"
                    ? "MONTHLY"
                    : form.payBasis,
              });
            }}
          >
            <option value="FOUR_INSURANCE">4대보험</option>
            <option value="THREE_POINT_THREE">3.3%</option>
          </TextSelect>
        </Field>

        {form.insuranceType === "THREE_POINT_THREE" ? (
          <Field label="급여 입력">
            <div className="flex gap-1">
              {(
                [
                  ["MONTHLY", "월급"],
                  ["HOURLY", "시급"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`desk-chip flex-1 ${form.payBasis === id ? "desk-chip-active" : "border border-line desk-chip-idle"}`}
                  onClick={() => setForm({ ...form, payBasis: id })}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        ) : null}

        <Field label={rateLabel}>
          <TextInput
            type="number"
            inputMode="numeric"
            placeholder={`${rateLabel} (원)`}
            value={form.monthlySalary}
            onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })}
          />
        </Field>

        <Field label="주 근무일">
          <div className="flex gap-1">
            {(
              [
                ["5", "주 5일"],
                ["6", "주 6일"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`desk-chip flex-1 ${form.workDaysPerWeek === id ? "desk-chip-active" : "border border-line desk-chip-idle"}`}
                onClick={() => setForm({ ...form, workDaysPerWeek: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="입사일">
          <TextInput
            type="date"
            value={form.hireDate}
            onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
          />
        </Field>
        <Field label="보건증 만료일">
          <TextInput
            type="date"
            value={form.healthCertExpire}
            onChange={(e) => setForm({ ...form, healthCertExpire: e.target.value })}
          />
        </Field>
        <Field label="연락처">
          <TextInput
            placeholder="010-0000-0000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
      </div>

      <div className="rounded-btn border border-line bg-paper/40 p-3">
        <p className="mb-2 text-sm font-medium text-foreground">은행계좌 (급여이체·대장)</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <TextInput
            placeholder="은행명"
            value={form.bankName}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          />
          <TextInput
            placeholder="계좌번호"
            value={form.accountNumber}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
          />
          <TextInput
            placeholder="예금주"
            value={form.accountHolder}
            onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
          />
        </div>
      </div>

      {showStatus ? (
        <Field label="상태">
          <TextSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ACTIVE">활성</option>
            <option value="RESIGNED">비활성</option>
          </TextSelect>
        </Field>
      ) : null}

      <Field label="메모">
        <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>
    </div>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [message, setMessage] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [editMessage, setEditMessage] = useState("");
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

  function toggleOwnerBranch(id: number, target: "create" | "edit") {
    const apply = (f: FormState) => ({
      ...f,
      ownerBranchIds: f.ownerBranchIds.includes(id)
        ? f.ownerBranchIds.filter((x) => x !== id)
        : [...f.ownerBranchIds, id],
    });
    if (target === "create") setForm(apply);
    else setEditForm(apply);
  }

  function openCreate() {
    setForm(emptyForm(branches[0] ? String(branches[0].id) : ""));
    setCreateMessage("");
    setMessage("");
    setCreating(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        branchId: form.role === "OWNER" || form.role === "SUPERADMIN" ? null : Number(form.branchId),
        ownerBranchIds: form.role === "OWNER" ? form.ownerBranchIds : [],
        monthlySalary: form.monthlySalary,
        workDaysPerWeek: Number(form.workDaysPerWeek),
        payBasis: form.insuranceType === "FOUR_INSURANCE" ? "MONTHLY" : form.payBasis,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      setCreateMessage(data.message || "등록에 실패했습니다.");
      return;
    }
    setCreating(false);
    setForm(emptyForm(branches[0] ? String(branches[0].id) : ""));
    setMessage(data.message || "등록했습니다.");
    load();
  }

  function openEdit(employee: Employee) {
    setEditing(employee);
    setEditForm(fromEmployee(employee));
    setEditMessage("");
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const res = await fetch("/api/employees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        name: editForm.name,
        phone: editForm.phone,
        ssn: editForm.ssn,
        hireDate: editForm.hireDate,
        healthCertExpire: editForm.healthCertExpire,
        bankName: editForm.bankName,
        accountNumber: editForm.accountNumber,
        accountHolder: editForm.accountHolder,
        monthlySalary: editForm.monthlySalary,
        insuranceType: editForm.insuranceType,
        payBasis:
          editForm.insuranceType === "FOUR_INSURANCE" ? "MONTHLY" : editForm.payBasis,
        workDaysPerWeek: Number(editForm.workDaysPerWeek),
        password: editForm.password || undefined,
        notes: editForm.notes,
        status: editForm.status,
        branchId:
          editing.role === "OWNER" || editing.role === "SUPERADMIN"
            ? undefined
            : editForm.branchId
              ? Number(editForm.branchId)
              : undefined,
        ownerBranchIds: editing.role === "OWNER" ? editForm.ownerBranchIds : undefined,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      setEditMessage(data.message || "수정에 실패했습니다.");
      return;
    }
    setEditing(null);
    setMessage("직원 정보를 저장했습니다.");
    load();
  }

  async function setStatus(employee: Employee, status: "ACTIVE" | "RESIGNED") {
    const label = status === "ACTIVE" ? "활성" : "비활성";
    if (!confirm(`${employee.name} 계정을 ${label} 처리할까요?`)) return;
    const res = await fetch("/api/employees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: employee.id, status }),
    });
    const data = await res.json();
    setMessage(data.success ? `${employee.name}을(를) ${label} 처리했습니다.` : data.message || "실패");
    if (data.success) load();
  }

  async function removeEmployee(employee: Employee) {
    if (!confirm(`${employee.name} 계정을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    const res = await fetch(`/api/employees?id=${employee.id}`, { method: "DELETE" });
    const data = await res.json();
    setMessage(data.success ? `${employee.name}을(를) 삭제했습니다.` : data.message || "삭제 실패");
    if (data.success) load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="직원 관리"
        description="직원·파트는 지점+이름+비밀번호로 로그인합니다. 같은 지점 내 이름은 중복될 수 없습니다."
        actions={
          <Button type="button" onClick={openCreate}>
            등록
          </Button>
        }
      />

      {message ? <Message tone="ok">{message}</Message> : null}

      <TableShell>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-paper text-left text-muted">
              <tr>
                <th className="px-3 py-2">이름</th>
                <th className="px-3 py-2">등급</th>
                <th className="px-3 py-2">근무형태</th>
                <th className="px-3 py-2">주근무</th>
                <th className="px-3 py-2">보건증</th>
                <th className="px-3 py-2">계좌</th>
                <th className="px-3 py-2">지점</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => {
                const certTone = healthCertTone(e.healthCertExpire);
                return (
                  <tr key={e.id} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-foreground">{e.name}</td>
                    <td className="px-3 py-2">{e.roleLabel}</td>
                    <td className="px-3 py-2">
                      {e.role === "SUPERADMIN" || e.role === "OWNER" ? (
                        "-"
                      ) : (
                        <span className="inline-flex flex-wrap gap-1">
                          <Badge tone={e.insuranceType === "THREE_POINT_THREE" ? "gold" : "ink"}>
                            {insuranceLabel(e.insuranceType)}
                          </Badge>
                          {e.insuranceType === "THREE_POINT_THREE" ? (
                            <Badge tone="muted">{e.payBasis === "HOURLY" ? "시급" : "월급"}</Badge>
                          ) : null}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {e.role === "SUPERADMIN" || e.role === "OWNER"
                        ? "-"
                        : `주 ${e.workDaysPerWeek ?? 5}일`}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {e.healthCertExpire ? (
                        <Badge tone={certTone}>{toDateInput(e.healthCertExpire)}</Badge>
                      ) : (
                        <span className="text-muted">미등록</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {e.bankName || e.accountNumber ? (
                        <span>
                          {e.bankName ?? ""} {e.accountNumber ?? ""}
                        </span>
                      ) : (
                        "미등록"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {e.role === "SUPERADMIN"
                        ? "전체"
                        : e.role === "OWNER"
                          ? e.ownerBranches?.map((ob) => ob.branch.name).join(", ")
                          : e.branch?.name}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={e.status === "ACTIVE" ? "ink" : "muted"}>
                        {e.status === "ACTIVE" ? "활성" : "비활성"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button type="button" variant="link" size="sm" onClick={() => openEdit(e)}>
                        수정
                      </Button>
                      {isOwnerOrBelow(e.role) && canManageEmployeeAccount(actorRole, e.role) ? (
                        <>
                          {e.status === "ACTIVE" ? (
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={() => setStatus(e, "RESIGNED")}
                            >
                              비활성
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={() => setStatus(e, "ACTIVE")}
                            >
                              활성
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="text-danger"
                            onClick={() => removeEmployee(e)}
                          >
                            삭제
                          </Button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TableShell>

      {creating ? (
        <Modal
          title="계정 등록"
          onClose={() => setCreating(false)}
          footer={
            <>
              <Button type="submit" form="employee-create" className="flex-1" size="lg">
                등록
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setCreating(false)}>
                취소
              </Button>
            </>
          }
        >
          <form id="employee-create" onSubmit={onSubmit} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="이름">
                <TextInput
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="등급">
                <TextSelect
                  value={form.role}
                  onChange={(e) => {
                    const role = e.target.value;
                    setForm({
                      ...form,
                      role,
                      insuranceType: role === "PARTTIME" ? "THREE_POINT_THREE" : form.insuranceType,
                      payBasis: role === "PARTTIME" ? "HOURLY" : form.payBasis,
                    });
                  }}
                >
                  {actorRole === "SUPERADMIN" ? <option value="SUPERADMIN">최고관리자</option> : null}
                  <option value="OWNER">사장</option>
                  <option value="MANAGER">지점장</option>
                  <option value="STAFF">직원</option>
                  <option value="PARTTIME">파트타임</option>
                </TextSelect>
              </Field>
              {!isStaffLike(form.role) ? (
                <Field label="로그인 아이디">
                  <TextInput
                    value={form.loginId}
                    onChange={(e) => setForm({ ...form, loginId: e.target.value })}
                    required
                  />
                </Field>
              ) : (
                <p className="sm:col-span-2 rounded-btn border border-line bg-paper/60 px-3 py-2 text-sm text-muted">
                  직원·파트는 아이디 없이 <strong className="text-foreground">지점 + 이름 + 비밀번호</strong>로
                  로그인합니다. 같은 지점에 같은 이름은 등록할 수 없습니다.
                </p>
              )}
              <Field label="초기 비밀번호">
                <TextInput
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </Field>
            </div>

            {form.role === "SUPERADMIN" ? (
              <p className="text-sm text-muted">최고관리자는 모든 지점의 일정, 직원, 근태, 급여, 광고를 봅니다.</p>
            ) : form.role === "OWNER" ? (
              <div className="flex flex-wrap gap-2">
                {branches.map((b) => (
                  <label key={b.id} className="flex items-center gap-1 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.ownerBranchIds.includes(b.id)}
                      onChange={() => toggleOwnerBranch(b.id, "create")}
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            ) : (
              <Field label="소속 지점">
                <TextSelect value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </TextSelect>
              </Field>
            )}

            {form.role !== "SUPERADMIN" && form.role !== "OWNER" ? (
              <HrFields form={form} setForm={setForm} />
            ) : null}

            {createMessage ? <Message tone="danger">{createMessage}</Message> : null}
          </form>
        </Modal>
      ) : null}

      {editing ? (
        <Modal
          title={`${editing.name} 정보 수정`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button type="submit" form="employee-edit" className="flex-1" size="lg">
                저장
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setEditing(null)}>
                취소
              </Button>
            </>
          }
        >
          <form id="employee-edit" onSubmit={saveEdit} className="space-y-3">
            <Field label="이름">
              <TextInput
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </Field>
            <p className="text-sm text-muted">
              {isStaffLike(editing.role) ? (
                <>직원 로그인: 지점 + 이름 + 비밀번호 · {editing.roleLabel}</>
              ) : (
                <>
                  아이디 <span className="font-mono text-ink">{editing.loginId}</span> · {editing.roleLabel}
                </>
              )}
            </p>

            {isStaffLike(editing.role) ? (
              <Field label="비밀번호 변경 (선택)">
                <TextInput
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="바꾸려면 입력"
                />
              </Field>
            ) : null}

            {editing.role === "OWNER" ? (
              <div className="flex flex-wrap gap-2">
                {branches.map((b) => (
                  <label key={b.id} className="flex items-center gap-1 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={editForm.ownerBranchIds.includes(b.id)}
                      onChange={() => toggleOwnerBranch(b.id, "edit")}
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            ) : editing.role !== "SUPERADMIN" ? (
              <Field label="소속 지점">
                <TextSelect
                  value={editForm.branchId}
                  onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </TextSelect>
              </Field>
            ) : null}

            {editing.role !== "SUPERADMIN" && editing.role !== "OWNER" ? (
              <HrFields form={editForm} setForm={setEditForm} showStatus />
            ) : (
              <Field label="상태">
                <TextSelect
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="ACTIVE">활성</option>
                  <option value="RESIGNED">비활성</option>
                </TextSelect>
              </Field>
            )}

            {editMessage ? <Message tone="danger">{editMessage}</Message> : null}
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
