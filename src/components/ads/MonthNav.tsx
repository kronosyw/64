"use client";

import { monthLabel } from "@/lib/ads-ui";

export function MonthNav({
  year,
  month,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="desk-toolbar">
      <button
        type="button"
        onClick={onPrev}
        className="desk-chip desk-chip-idle"
        aria-label="이전달"
      >
        ◀
      </button>
      <div className="min-w-[7.25rem] px-1 text-center text-sm font-semibold tabular-nums text-ink">
        {monthLabel(year, month)}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="desk-chip desk-chip-idle"
        aria-label="다음달"
      >
        ▶
      </button>
    </div>
  );
}
