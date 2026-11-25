export const SHIFT_COLORS = ["#1a73e8", "#188038", "#e37400", "#a142f4", "#d93025", "#5f6368"] as const;

export const DEFAULT_SHIFTS = [
  { name: "오픈", startTime: "10:00", endTime: "16:00", isOff: false, color: "#1a73e8", sortOrder: 0 },
  { name: "마감", startTime: "16:00", endTime: "22:00", isOff: false, color: "#188038", sortOrder: 1 },
  { name: "오픈마감", startTime: "10:00", endTime: "22:00", isOff: false, color: "#e37400", sortOrder: 2 },
  { name: "저녁PT", startTime: "18:00", endTime: "22:00", isOff: false, color: "#a142f4", sortOrder: 3 },
  { name: "풀타임PT", startTime: "10:00", endTime: "22:00", isOff: false, color: "#d93025", sortOrder: 4 },
  { name: "휴무", startTime: null, endTime: null, isOff: true, color: "#5f6368", sortOrder: 5 },
] as const;

export function shiftRowsForBranch(branchId: number) {
  return DEFAULT_SHIFTS.map((shift) => ({ ...shift, branchId }));
}

export function cleanShiftColor(value: unknown) {
  const color = String(value ?? "").trim();
  return (SHIFT_COLORS as readonly string[]).includes(color) ? color : SHIFT_COLORS[0];
}

export function cleanClock(value: unknown) {
  const time = String(value ?? "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null;
}
