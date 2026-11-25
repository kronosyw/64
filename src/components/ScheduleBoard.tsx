"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { roleLabel, WORK_TYPE_LABEL, type WorkTypeKey } from "@/lib/roles";
import { BREAK_OPTIONS, netWorkHours } from "@/lib/schedule-hours";
import { SHIFT_COLORS } from "@/lib/shift-options";
import {
  Badge,
  Button,
  CheckLabel,
  Field,
  Message,
  Modal,
  Panel,
  TextInput,
  TextSelect,
} from "@/components/ui";

type Schedule = {
  id: number;
  employeeId: number;
  employeeName: string;
  workType: WorkTypeKey;
  shiftId: number | null;
  shiftName: string | null;
  shift?: { color: string; isOff: boolean } | null;
  workDate: string;
  startTime: string | null;
  endTime: string | null;
};

type Shift = {
  id: number;
  name: string;
  startTime: string | null;
  endTime: string | null;
  isOff: boolean;
  color: string;
};

type Employee = { id: number; name: string; role: string; status: string };
type Memo = {
  id: number;
  content: string;
  author: string;
  isImportant: boolean;
};
type Editor = {
  id: number | null;
  employeeId: string;
  shiftId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  breakMinutes: string;
};

type BulkDraft = {
  employeeIds: number[];
  weekdays: number[];
  dayTimes: Record<number, { startTime: string; endTime: string }>;
  breakMinutes: string;
  shiftId: string;
  replaceExisting: boolean;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DEFAULT_DAY_TIME = { startTime: "10:00", endTime: "22:00" };

function emptyBulk(): BulkDraft {
  return {
    employeeIds: [],
    weekdays: [1, 2, 3, 4, 5],
    dayTimes: {
      0: { ...DEFAULT_DAY_TIME },
      1: { ...DEFAULT_DAY_TIME },
      2: { ...DEFAULT_DAY_TIME },
      3: { ...DEFAULT_DAY_TIME },
      4: { ...DEFAULT_DAY_TIME },
      5: { ...DEFAULT_DAY_TIME },
      6: { ...DEFAULT_DAY_TIME },
    },
    breakMinutes: "90",
    shiftId: "",
    replaceExisting: false,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateValue(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function dayOf(iso: string) {
  return new Date(iso).getUTCDate();
}

function labelOf(schedule: Schedule) {
  return schedule.shiftName || WORK_TYPE_LABEL[schedule.workType] || schedule.workType;
}

function colorOf(schedule: Schedule, shifts: Shift[]) {
  return schedule.shift?.color || shifts.find((s) => s.id === schedule.shiftId)?.color || "#1a73e8";
}

export function ScheduleBoard({
  branchId,
  year,
  month,
  canEdit,
  showMemo,
}: {
  branchId: number;
  year: number;
  month: number;
  canEdit: boolean;
  showMemo: boolean;
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [bulk, setBulk] = useState<BulkDraft | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [shiftDraft, setShiftDraft] = useState<{
    name: string;
    startTime: string;
    endTime: string;
    isOff: boolean;
    color: string;
  }>({ name: "", startTime: "10:00", endTime: "16:00", isOff: false, color: SHIFT_COLORS[0] });
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [memoContent, setMemoContent] = useState("");
  const [message, setMessage] = useState("");
  const [selectedDay, setSelectedDay] = useState(1);
  const [today, setToday] = useState<number | null>(null);

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
  const firstWeekday = useMemo(() => new Date(year, month - 1, 1).getDay(), [year, month]);

  async function load() {
    const [sRes, shiftRes] = await Promise.all([
      fetch(`/api/schedules?branchId=${branchId}&year=${year}&month=${month}`),
      fetch(`/api/shifts?branchId=${branchId}`),
    ]);
    const sData = await sRes.json();
    const shiftData = await shiftRes.json();
    if (sData.success) setSchedules(sData.schedules);
    if (shiftData.success) setShifts(shiftData.shifts);

    if (canEdit) {
      const eRes = await fetch(`/api/employees?branchId=${branchId}`);
      const eData = await eRes.json();
      if (eData.success) {
        setEmployees(
          eData.employees.filter(
            (e: Employee) =>
              e.status === "ACTIVE" &&
              e.role !== "SUPERADMIN" &&
              ["OWNER", "MANAGER", "STAFF", "PARTTIME"].includes(e.role),
          ),
        );
      }
    }

    if (showMemo) {
      const mRes = await fetch(`/api/memos?branchId=${branchId}`);
      const mData = await mRes.json();
      if (mData.success) setMemos(mData.memos);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, year, month]);

  useEffect(() => {
    const now = new Date();
    const inMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
    setToday(inMonth ? now.getDate() : null);
    setSelectedDay(inMonth ? now.getDate() : 1);
  }, [year, month]);

  const byDate = useMemo(() => {
    const map = new Map<number, Schedule[]>();
    for (const schedule of schedules) {
      const day = dayOf(schedule.workDate);
      const list = map.get(day) || [];
      list.push(schedule);
      map.set(day, list);
    }
    return map;
  }, [schedules]);

  function blankEditor(day: number, schedule?: Schedule): Editor {
    const shift = schedule
      ? shifts.find((s) => s.id === schedule.shiftId) || shifts[0]
      : shifts.find((s) => !s.isOff) || shifts[0];
    return {
      id: schedule?.id ?? null,
      employeeId: schedule ? String(schedule.employeeId) : "",
      shiftId: shift ? String(shift.id) : "",
      workDate: schedule ? schedule.workDate.slice(0, 10) : dateValue(year, month, day),
      startTime: schedule?.startTime || shift?.startTime || "10:00",
      endTime: schedule?.endTime || shift?.endTime || "22:00",
      breakMinutes: "90",
    };
  }

  function openCreate(day: number) {
    if (!canEdit) {
      setSelectedDay(day);
      return;
    }
    setSelectedDay(day);
    setMessage("");
    setEditor(blankEditor(day));
  }

  function openEdit(schedule: Schedule) {
    setSelectedDay(dayOf(schedule.workDate));
    if (!canEdit) return;
    setMessage("");
    setEditor(blankEditor(dayOf(schedule.workDate), schedule));
  }

  function applyShift(shiftId: string) {
    const shift = shifts.find((s) => String(s.id) === shiftId);
    setEditor((current) =>
      current
        ? {
            ...current,
            shiftId,
            startTime: shift?.isOff ? "" : shift?.startTime || current.startTime,
            endTime: shift?.isOff ? "" : shift?.endTime || current.endTime,
          }
        : current,
    );
  }

  async function saveSchedule(e: FormEvent) {
    e.preventDefault();
    if (!editor) return;
    setMessage("");
    const payload = {
      id: editor.id,
      branchId,
      employeeId: Number(editor.employeeId),
      shiftId: Number(editor.shiftId),
      workDate: editor.workDate,
      startTime: editor.startTime,
      endTime: editor.endTime,
      breakMinutes: Number(editor.breakMinutes || 0),
      workHours: netWorkHours(editor.startTime, editor.endTime, Number(editor.breakMinutes || 0)),
    };
    const res = await fetch("/api/schedules", {
      method: editor.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) {
      setMessage(data.message || "저장에 실패했습니다.");
      return;
    }
    setEditor(null);
    setMessage(editor.id ? "수정했습니다." : "등록했습니다.");
    load();
  }

  function toggleBulkEmployee(id: number) {
    setBulk((current) => {
      if (!current) return current;
      const employeeIds = current.employeeIds.includes(id)
        ? current.employeeIds.filter((x) => x !== id)
        : [...current.employeeIds, id];
      return { ...current, employeeIds };
    });
  }

  function toggleBulkWeekday(day: number) {
    setBulk((current) => {
      if (!current) return current;
      const weekdays = current.weekdays.includes(day)
        ? current.weekdays.filter((x) => x !== day)
        : [...current.weekdays, day].sort();
      return { ...current, weekdays };
    });
  }

  async function saveBulk(e: FormEvent) {
    e.preventDefault();
    if (!bulk) return;
    if (!bulk.employeeIds.length || !bulk.weekdays.length) {
      setMessage("인원과 요일을 선택하세요.");
      return;
    }
    setBulkLoading(true);
    setMessage("");
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk",
        branchId,
        year,
        month,
        employeeIds: bulk.employeeIds,
        weekdays: bulk.weekdays,
        dayTimes: Object.fromEntries(
          bulk.weekdays.map((day) => [String(day), bulk.dayTimes[day] || DEFAULT_DAY_TIME]),
        ),
        breakMinutes: Number(bulk.breakMinutes || 0),
        shiftId: bulk.shiftId ? Number(bulk.shiftId) : null,
        replaceExisting: bulk.replaceExisting,
      }),
    });
    const data = await res.json();
    setBulkLoading(false);
    if (!data.success) {
      setMessage(data.message || "일괄 등록에 실패했습니다.");
      return;
    }
    setBulk(null);
    setMessage(data.message || "일괄 등록했습니다.");
    load();
  }

  async function removeSchedule(id: number) {
    if (!confirm("이 일정을 삭제할까요?")) return;
    await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
    setEditor(null);
    load();
  }

  async function saveShift(e: FormEvent) {
    e.preventDefault();
    const draft = editingShift
      ? {
          id: editingShift.id,
          name: editingShift.name,
          startTime: editingShift.startTime,
          endTime: editingShift.endTime,
          isOff: editingShift.isOff,
          color: editingShift.color,
        }
      : shiftDraft;
    const res = await fetch("/api/shifts", {
      method: editingShift ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, branchId }),
    });
    const data = await res.json();
    setMessage(data.message || (data.success ? "근무형태를 저장했습니다." : "근무형태 저장에 실패했습니다."));
    if (data.success) {
      setShiftDraft({ name: "", startTime: "10:00", endTime: "16:00", isOff: false, color: SHIFT_COLORS[0] });
      setEditingShift(null);
      load();
    }
  }

  async function removeShift(id: number) {
    if (!confirm("이 근무형태를 삭제할까요? 이미 등록된 일정은 남습니다.")) return;
    await fetch(`/api/shifts?id=${id}`, { method: "DELETE" });
    if (editingShift?.id === id) setEditingShift(null);
    load();
  }

  async function createMemo() {
    const res = await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, content: memoContent }),
    });
    const data = await res.json();
    if (data.success) {
      setMemoContent("");
      load();
    } else {
      setMessage(data.message || "메모 실패");
    }
  }

  const selectedShift = shifts.find((s) => String(s.id) === editor?.shiftId);
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => openCreate(selectedDay)}>
            일정 등록
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMessage("");
              setBulk(emptyBulk());
            }}
          >
            월 일괄 등록
          </Button>
        </div>
      ) : null}

      {canEdit ? (
        <details className="rounded-panel border border-line bg-card open:shadow-[0_1px_0_rgba(12,35,64,0.04)]">
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-ink marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              이 지점 근무형태
              <span className="text-xs font-normal text-muted">펼치기</span>
            </span>
          </summary>
          <div className="border-t border-line px-4 pb-4 pt-3">
            <p className="text-sm text-muted">지점마다 이름과 시간이 다릅니다. 최고관리자, 사장, 지점장만 바꿀 수 있습니다.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {shifts.map((shift) => (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() => setEditingShift(shift)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium transition-transform active:scale-95"
                  style={{ backgroundColor: `${shift.color}22`, color: shift.color }}
                >
                  {shift.name}
                  {shift.isOff ? "" : ` ${shift.startTime}-${shift.endTime}`}
                </button>
              ))}
              {!shifts.length ? <p className="text-sm text-muted">등록된 근무형태가 없습니다.</p> : null}
            </div>
            <form onSubmit={saveShift} className="mt-4 grid gap-2 sm:grid-cols-6">
              <TextInput
                className="sm:col-span-2"
                placeholder="이름"
                value={editingShift ? editingShift.name : shiftDraft.name}
                onChange={(e) =>
                  editingShift
                    ? setEditingShift({ ...editingShift, name: e.target.value })
                    : setShiftDraft({ ...shiftDraft, name: e.target.value })
                }
                required
              />
              <CheckLabel
                checked={editingShift ? editingShift.isOff : shiftDraft.isOff}
                onChange={(e) =>
                  editingShift
                    ? setEditingShift({ ...editingShift, isOff: e.target.checked })
                    : setShiftDraft({ ...shiftDraft, isOff: e.target.checked })
                }
              >
                휴무
              </CheckLabel>
              <TextInput
                type="time"
                disabled={editingShift ? editingShift.isOff : shiftDraft.isOff}
                value={editingShift ? editingShift.startTime || "" : shiftDraft.startTime}
                onChange={(e) =>
                  editingShift
                    ? setEditingShift({ ...editingShift, startTime: e.target.value })
                    : setShiftDraft({ ...shiftDraft, startTime: e.target.value })
                }
              />
              <TextInput
                type="time"
                disabled={editingShift ? editingShift.isOff : shiftDraft.isOff}
                value={editingShift ? editingShift.endTime || "" : shiftDraft.endTime}
                onChange={(e) =>
                  editingShift
                    ? setEditingShift({ ...editingShift, endTime: e.target.value })
                    : setShiftDraft({ ...shiftDraft, endTime: e.target.value })
                }
              />
              <div className="flex items-center gap-1.5">
                {SHIFT_COLORS.map((color) => {
                  const current = editingShift ? editingShift.color : shiftDraft.color;
                  return (
                    <button
                      key={color}
                      type="button"
                      aria-label={color}
                      onClick={() =>
                        editingShift ? setEditingShift({ ...editingShift, color }) : setShiftDraft({ ...shiftDraft, color })
                      }
                      className="h-7 w-7 rounded-full border-2 transition-transform active:scale-90"
                      style={{ backgroundColor: color, borderColor: current === color ? "#0c2340" : "transparent" }}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-6">
                <Button type="submit">{editingShift ? "근무형태 수정" : "근무형태 등록"}</Button>
                {editingShift ? (
                  <>
                    <Button type="button" variant="ghost" onClick={() => setEditingShift(null)}>
                      새로 등록
                    </Button>
                    <Button type="button" variant="danger" onClick={() => removeShift(editingShift.id)}>
                      삭제
                    </Button>
                  </>
                ) : null}
              </div>
            </form>
          </div>
        </details>
      ) : null}

      <div className="md:hidden">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const active = day === selectedDay;
            const count = byDate.get(day)?.length ?? 0;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`flex w-12 shrink-0 flex-col items-center rounded-2xl px-1 py-2 text-xs ${
                  active ? "bg-ink text-paper" : "bg-card text-ink"
                }`}
              >
                <span className={active ? "text-paper/70" : "text-muted"}>
                  {WEEKDAYS[new Date(year, month - 1, day).getDay()]}
                </span>
                <span className="text-base font-semibold">{day}</span>
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${count ? (active ? "bg-card" : "bg-ink") : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
        <div className="mt-2 rounded-panel border border-line bg-card p-3 shadow-[0_1px_0_rgba(12,35,64,0.04)]">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-ink">
              {month}월 {selectedDay}일 {WEEKDAYS[new Date(year, month - 1, selectedDay).getDay()]}
            </h2>
            {canEdit ? (
              <Button type="button" size="sm" onClick={() => openCreate(selectedDay)}>
                등록
              </Button>
            ) : null}
          </div>
          <div className="space-y-2">
            {(byDate.get(selectedDay) || []).map((schedule) => (
              <button
                key={schedule.id}
                type="button"
                onClick={() => openEdit(schedule)}
                className="flex w-full gap-3 rounded-panel border border-line bg-paper/40 px-3 py-3 text-left transition-colors hover:bg-paper"
                style={{ borderLeft: `4px solid ${colorOf(schedule, shifts)}` }}
              >
                <div className="w-16 shrink-0 text-sm text-muted">
                  {schedule.startTime ? (
                    <>
                      <div>{schedule.startTime}</div>
                      <div>{schedule.endTime}</div>
                    </>
                  ) : (
                    <div>종일</div>
                  )}
                </div>
                <div>
                  <div className="font-medium">{schedule.employeeName}</div>
                  <div className="text-sm" style={{ color: colorOf(schedule, shifts) }}>
                    {labelOf(schedule)}
                  </div>
                </div>
              </button>
            ))}
            {(byDate.get(selectedDay) || []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">이 날 일정이 없습니다.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-panel border border-line bg-card md:block">
        <div className="grid grid-cols-7 border-b bg-paper text-center text-xs font-medium text-muted">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, index) => (
            <div
              key={day ? `d-${day}` : `e-${index}`}
              className="min-h-32 border-b border-r border-line p-1.5"
            >
              {day ? (
                <>
                  <button
                    type="button"
                    onClick={() => openCreate(day)}
                    className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                      today === day ? "bg-ink font-semibold text-paper" : "text-ink hover:bg-paper"
                    }`}
                  >
                    {day}
                  </button>
                  <div className="space-y-1">
                    {(byDate.get(day) || []).map((schedule) => (
                      <button
                        key={schedule.id}
                        type="button"
                        onClick={() => openEdit(schedule)}
                        className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium"
                        style={{ backgroundColor: `${colorOf(schedule, shifts)}22`, color: colorOf(schedule, shifts) }}
                      >
                        {schedule.startTime ? `${schedule.startTime} ` : ""}
                        {schedule.employeeName} {labelOf(schedule)}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {message ? <Message>{message}</Message> : null}

      {editor ? (
        <Modal
          title={editor.id ? "일정 수정" : "일정 등록"}
          onClose={() => setEditor(null)}
          footer={
            <>
              <Button type="submit" form="schedule-editor" className="flex-1" size="lg">
                저장
              </Button>
              {editor.id ? (
                <Button type="button" variant="danger" size="lg" onClick={() => removeSchedule(editor.id!)}>
                  삭제
                </Button>
              ) : null}
            </>
          }
        >
          <form id="schedule-editor" onSubmit={saveSchedule} className="grid gap-3">
            <TextSelect
              value={editor.employeeId}
              onChange={(e) => setEditor({ ...editor, employeeId: e.target.value })}
              required
            >
              <option value="">근무자 선택</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({roleLabel(employee.role)})
                </option>
              ))}
            </TextSelect>
            <TextSelect value={editor.shiftId} onChange={(e) => applyShift(e.target.value)} required>
              <option value="">근무형태</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                  {shift.isOff ? "" : ` ${shift.startTime}-${shift.endTime}`}
                </option>
              ))}
            </TextSelect>
            <TextInput
              type="date"
              value={editor.workDate}
              onChange={(e) => setEditor({ ...editor, workDate: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <Field label="시작">
                <TextInput
                  type="time"
                  value={editor.startTime}
                  disabled={selectedShift?.isOff}
                  onChange={(e) => setEditor({ ...editor, startTime: e.target.value })}
                />
              </Field>
              <Field label="종료">
                <TextInput
                  type="time"
                  value={editor.endTime}
                  disabled={selectedShift?.isOff}
                  onChange={(e) => setEditor({ ...editor, endTime: e.target.value })}
                />
              </Field>
            </div>
            {!selectedShift?.isOff ? (
              <Field
                label="휴게"
                hint={`실근무 ${netWorkHours(editor.startTime, editor.endTime, Number(editor.breakMinutes || 0))}시간 (급여 반영)`}
              >
                <TextSelect
                  value={editor.breakMinutes}
                  onChange={(e) => setEditor({ ...editor, breakMinutes: e.target.value })}
                >
                  {BREAK_OPTIONS.map((opt) => (
                    <option key={opt.minutes} value={opt.minutes}>
                      {opt.label}
                    </option>
                  ))}
                </TextSelect>
              </Field>
            ) : null}
          </form>
        </Modal>
      ) : null}

      {bulk ? (
        <Modal
          title={`${year}년 ${month}월 일괄 등록`}
          onClose={() => setBulk(null)}
          footer={
            <>
              <Button type="submit" form="schedule-bulk" className="flex-1" size="lg" disabled={bulkLoading}>
                {bulkLoading ? "등록 중..." : "일괄 등록"}
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setBulk(null)}>
                취소
              </Button>
            </>
          }
        >
          <form id="schedule-bulk" onSubmit={saveBulk} className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-ink">근무자 (사장·지점장·직원·파트)</p>
              <div className="flex flex-wrap gap-2">
                {employees.map((employee) => (
                  <CheckLabel
                    key={employee.id}
                    checked={bulk.employeeIds.includes(employee.id)}
                    onChange={() => toggleBulkEmployee(employee.id)}
                  >
                    {employee.name} ({roleLabel(employee.role)})
                  </CheckLabel>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink">요일</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((label, day) => (
                  <CheckLabel
                    key={label}
                    checked={bulk.weekdays.includes(day)}
                    onChange={() => toggleBulkWeekday(day)}
                  >
                    {label}
                  </CheckLabel>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">요일별 시간</p>
              {bulk.weekdays.map((day) => (
                <div key={day} className="grid grid-cols-[3rem_1fr_1fr] items-center gap-2">
                  <span className="text-sm text-muted">{WEEKDAYS[day]}</span>
                  <TextInput
                    type="time"
                    value={bulk.dayTimes[day]?.startTime || "10:00"}
                    onChange={(e) =>
                      setBulk({
                        ...bulk,
                        dayTimes: {
                          ...bulk.dayTimes,
                          [day]: {
                            startTime: e.target.value,
                            endTime: bulk.dayTimes[day]?.endTime || "22:00",
                          },
                        },
                      })
                    }
                  />
                  <TextInput
                    type="time"
                    value={bulk.dayTimes[day]?.endTime || "22:00"}
                    onChange={(e) =>
                      setBulk({
                        ...bulk,
                        dayTimes: {
                          ...bulk.dayTimes,
                          [day]: {
                            startTime: bulk.dayTimes[day]?.startTime || "10:00",
                            endTime: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <Field label="휴게시간" hint="선택한 휴게는 실근무시간에서 빠지고 급여 계산에 쓰입니다.">
              <TextSelect
                value={bulk.breakMinutes}
                onChange={(e) => setBulk({ ...bulk, breakMinutes: e.target.value })}
              >
                {BREAK_OPTIONS.map((opt) => (
                  <option key={opt.minutes} value={opt.minutes}>
                    {opt.label}
                  </option>
                ))}
              </TextSelect>
            </Field>

            <Field label="근무형태 (선택)">
              <TextSelect value={bulk.shiftId} onChange={(e) => setBulk({ ...bulk, shiftId: e.target.value })}>
                <option value="">직접 시간만 사용</option>
                {shifts
                  .filter((s) => !s.isOff)
                  .map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name}
                    </option>
                  ))}
              </TextSelect>
            </Field>

            <CheckLabel
              checked={bulk.replaceExisting}
              onChange={(e) => setBulk({ ...bulk, replaceExisting: e.target.checked })}
            >
              같은 날 기존 일정 덮어쓰기
            </CheckLabel>
          </form>
        </Modal>
      ) : null}

      {showMemo ? (
        <Panel title="메모">
          <div className="mb-3 flex gap-2">
            <TextInput
              className="flex-1"
              placeholder="새 메모"
              value={memoContent}
              onChange={(e) => setMemoContent(e.target.value)}
            />
            <Button type="button" variant="gold" onClick={createMemo}>
              작성
            </Button>
          </div>
          <div className="space-y-2">
            {memos.map((memo) => (
              <div key={memo.id} className="rounded-btn border border-gold/40 bg-gold/10 p-3 text-sm">
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>{memo.author}</span>
                  {memo.isImportant ? <Badge tone="danger">중요</Badge> : null}
                </div>
                <p>{memo.content}</p>
              </div>
            ))}
            {!memos.length ? <p className="text-sm text-muted">등록된 메모가 없습니다.</p> : null}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
