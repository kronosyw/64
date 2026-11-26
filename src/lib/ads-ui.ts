export type AdsBranch = { id: number; name: string; code?: string };
export type AdsPlatform = { id: number; name: string; code?: string; colorCode?: string };
export type AdsStore = {
  id: number;
  name: string;
  platformId: number;
  storeType: "OWN" | "COMPETITOR";
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
