"use client";

import { Button } from "@/components/ui";
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
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onPrev}>
        이전달
      </Button>
      <div className="min-w-[7.5rem] text-center text-sm font-semibold text-ink">{monthLabel(year, month)}</div>
      <Button type="button" variant="ghost" size="sm" onClick={onNext}>
        다음달
      </Button>
    </div>
  );
}
