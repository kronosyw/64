/** 시작~종료 시간(시). 야간 근무는 +24h. */
export function hoursBetween(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}

/** 휴게 차감 후 실근무시간 (급여 집계용으로 schedule.workHours에 저장) */
export function netWorkHours(
  start: string | null | undefined,
  end: string | null | undefined,
  breakMinutes = 0,
) {
  const raw = hoursBetween(start, end);
  const net = Math.max(0, raw - Math.max(0, breakMinutes) / 60);
  return Math.round(net * 100) / 100;
}

export function datesInMonthByWeekdays(year: number, month: number, weekdays: number[]) {
  const wanted = new Set(weekdays);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dates: string[] = [];
  for (let day = 1; day <= days; day += 1) {
    const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (!wanted.has(dow)) continue;
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    dates.push(`${year}-${mm}-${dd}`);
  }
  return dates;
}

export const BREAK_OPTIONS = [
  { minutes: 0, label: "없음" },
  { minutes: 30, label: "30분" },
  { minutes: 60, label: "1시간" },
  { minutes: 90, label: "1시간 30분" },
  { minutes: 120, label: "2시간" },
] as const;
