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
    <div className="inline-flex items-center gap-0.5 rounded-btn border border-line bg-card p-0.5">
      <button
        type="button"
        onClick={onPrev}
        className="min-h-8 rounded-[0.5rem] px-2.5 text-sm text-muted transition-colors hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
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
        className="min-h-8 rounded-[0.5rem] px-2.5 text-sm text-muted transition-colors hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
        aria-label="다음달"
      >
        ▶
      </button>
    </div>
  );
}
