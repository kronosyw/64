export type AdsBranch = { id: number; name: string; code?: string };
export type AdsPlatform = { id: number; name: string; code?: string; colorCode?: string };
export type AdsStore = {
  id: number;
  name: string;
  platformId: number;
  storeType: "OWN" | "COMPETITOR";
  sortOrder?: number;
  platform?: AdsPlatform;
};

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function shiftYearMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function monthLabel(year: number, month: number) {
  return `${year}년 ${month}월`;
}

export function weekdayOf(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}

export function formatNum(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}

export function dateKey(value: string | Date) {
  return String(value).slice(0, 10);
}

/** Compact label for branch switcher buttons. */
export function shortBranchLabel(name: string) {
  const n = String(name || "").trim();
  if (n.includes("송파")) return "송파";
  if (n.includes("야탑")) return "분당야탑";
  if (n.includes("분당")) return "분당";
  return n.length > 10 ? `${n.slice(0, 10)}…` : n;
}

export function weekendRowClass(dateStr: string) {
  const day = new Date(`${dateKey(dateStr)}T12:00:00`).getDay();
  if (day === 0) return "bg-red-50/75";
  if (day === 6) return "bg-amber-50/75";
  return "";
}

export function weekendDayClass(weekday: number) {
  if (weekday === 0) return "bg-red-50/90";
  if (weekday === 6) return "bg-amber-50/90";
  return "";
}
