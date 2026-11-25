"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { WORK_TYPE_LABEL, type WorkTypeKey } from "@/lib/roles";
import { SHIFT_COLORS } from "@/lib/shift-options";

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
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

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
            (e: Employee) => e.status === "ACTIVE" && e.role !== "OWNER" && e.role !== "SUPERADMIN",
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
        <details className="rounded-panel border border-line bg-card p-4">
          <summary className="cursor-pointer font-semibold">이 지점 근무형태</summary>
          <p className="mt-1 text-sm text-muted">지점마다 이름과 시간이 다릅니다. 최고관리자, 사장, 지점장만 바꿀 수 있습니다.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {shifts.map((shift) => (
              <button
                key={shift.id}
                type="button"
                onClick={() => setEditingShift(shift)}
                className="rounded-full px-3 py-1 text-sm font-medium"
                style={{ backgroundColor: `${shift.color}22`, color: shift.color }}
              >
                {shift.name}
                {shift.isOff ? "" : ` ${shift.startTime}-${shift.endTime}`}
              </button>
            ))}
            {!shifts.length ? <p className="text-sm text-muted">등록된 근무형태가 없습니다.</p> : null}
          </div>
          <form onSubmit={saveShift} className="mt-4 grid gap-2 sm:grid-cols-6">
            <input
              className="rounded-btn border px-2 py-2 text-sm sm:col-span-2"
              placeholder="이름"
              value={editingShift ? editingShift.name : shiftDraft.name}
              onChange={(e) =>
                editingShift
                  ? setEditingShift({ ...editingShift, name: e.target.value })
                  : setShiftDraft({ ...shiftDraft, name: e.target.value })
              }
              required
            />
            <label className="flex items-center gap-2 rounded-btn border px-2 py-2 text-sm">
              <input
                type="checkbox"
                checked={editingShift ? editingShift.isOff : shiftDraft.isOff}
                onChange={(e) =>
                  editingShift
                    ? setEditingShift({ ...editingShift, isOff: e.target.checked })
                    : setShiftDraft({ ...shiftDraft, isOff: e.target.checked })
                }
              />
              휴무
            </label>
            <input
              type="time"
              className="rounded-btn border px-2 py-2 text-sm"
              disabled={editingShift ? editingShift.isOff : shiftDraft.isOff}
              value={editingShift ? editingShift.startTime || "" : shiftDraft.startTime}
              onChange={(e) =>
                editingShift
                  ? setEditingShift({ ...editingShift, startTime: e.target.value })
                  : setShiftDraft({ ...shiftDraft, startTime: e.target.value })
              }
            />
            <input
              type="time"
              className="rounded-btn border px-2 py-2 text-sm"
              disabled={editingShift ? editingShift.isOff : shiftDraft.isOff}
              value={editingShift ? editingShift.endTime || "" : shiftDraft.endTime}
              onChange={(e) =>
                editingShift
                  ? setEditingShift({ ...editingShift, endTime: e.target.value })
                  : setShiftDraft({ ...shiftDraft, endTime: e.target.value })
              }
            />
            <div className="flex items-center gap-1">
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
                    className="h-6 w-6 rounded-full border-2"
                    style={{ backgroundColor: color, borderColor: current === color ? "#0f172a" : "transparent" }}
                  />
                );
              })}
            </div>
            <div className="flex gap-2 sm:col-span-6">
              <button type="submit" className="rounded-btn bg-ink px-3 py-2 text-sm text-paper">
                {editingShift ? "근무형태 수정" : "근무형태 등록"}
              </button>
              {editingShift ? (
                <>
                  <button type="button" className="rounded-btn border px-3 py-2 text-sm" onClick={() => setEditingShift(null)}>
                    새로 등록
                  </button>
                  <button type="button" className="rounded-btn px-3 py-2 text-sm text-danger" onClick={() => removeShift(editingShift.id)}>
                    삭제
                  </button>
                </>
              ) : null}
            </div>
          </form>
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
        <div className="mt-2 rounded-2xl bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">
              {month}월 {selectedDay}일 {WEEKDAYS[new Date(year, month - 1, selectedDay).getDay()]}
            </h2>
            {canEdit ? (
              <button type="button" onClick={() => openCreate(selectedDay)} className="rounded-full bg-ink px-3 py-1.5 text-sm text-paper">
                등록
              </button>
            ) : null}
          </div>
          <div className="space-y-2">
            {(byDate.get(selectedDay) || []).map((schedule) => (
              <button
                key={schedule.id}
                type="button"
                onClick={() => openEdit(schedule)}
                className="flex w-full gap-3 rounded-panel border border-line px-3 py-3 text-left"
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

      {message ? <p className="text-sm text-muted">{message}</p> : null}

      {editor ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 md:items-center md:p-6">
          <form onSubmit={saveSchedule} className="w-full max-w-lg rounded-t-2xl bg-card p-4 shadow-xl md:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editor.id ? "일정 수정" : "일정 등록"}</h2>
              <button type="button" className="text-sm text-muted" onClick={() => setEditor(null)}>
                닫기
              </button>
            </div>
            <div className="grid gap-2">
              <select
                className="rounded-btn border px-3 py-2 text-sm"
                value={editor.employeeId}
                onChange={(e) => setEditor({ ...editor, employeeId: e.target.value })}
                required
              >
                <option value="">직원 선택</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-btn border px-3 py-2 text-sm"
                value={editor.shiftId}
                onChange={(e) => applyShift(e.target.value)}
                required
              >
                <option value="">근무형태</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name}
                    {shift.isOff ? "" : ` ${shift.startTime}-${shift.endTime}`}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="rounded-btn border px-3 py-2 text-sm"
                value={editor.workDate}
                onChange={(e) => setEditor({ ...editor, workDate: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  className="rounded-btn border px-3 py-2 text-sm"
                  value={editor.startTime}
                  disabled={selectedShift?.isOff}
                  onChange={(e) => setEditor({ ...editor, startTime: e.target.value })}
                />
                <input
                  type="time"
                  className="rounded-btn border px-3 py-2 text-sm"
                  value={editor.endTime}
                  disabled={selectedShift?.isOff}
                  onChange={(e) => setEditor({ ...editor, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" className="flex-1 rounded-btn bg-ink py-2.5 text-sm font-medium text-paper">
                저장
              </button>
              {editor.id ? (
                <button type="button" className="rounded-btn px-3 py-2.5 text-sm text-danger" onClick={() => removeSchedule(editor.id!)}>
                  삭제
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      {showMemo ? (
        <div className="rounded-panel border border-line bg-card p-4">
          <h2 className="mb-3 font-semibold">메모</h2>
          <div className="mb-3 flex gap-2">
            <input
              className="flex-1 rounded-btn border px-3 py-2 text-sm"
              placeholder="새 메모"
              value={memoContent}
              onChange={(e) => setMemoContent(e.target.value)}
            />
            <button type="button" onClick={createMemo} className="rounded-btn bg-gold px-3 py-2 text-sm font-medium text-ink">
              작성
            </button>
          </div>
          <div className="space-y-2">
            {memos.map((memo) => (
              <div key={memo.id} className="rounded-btn border border-gold/40 bg-gold/10 p-3 text-sm">
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>{memo.author}</span>
                  {memo.isImportant ? <span className="text-danger">중요</span> : null}
                </div>
                <p>{memo.content}</p>
              </div>
            ))}
            {!memos.length ? <p className="text-sm text-muted">등록된 메모가 없습니다.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
