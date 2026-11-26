"use client";

import { ReactNode } from "react";

export function AdsStatCards({
  items,
  columns = 4,
}: {
  items: Array<{ label: string; value: ReactNode; hint?: string }>;
  columns?: 4 | 5;
}) {
  const grid =
    columns === 5
      ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
      : "grid gap-2 sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={grid}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-btn border border-line bg-gradient-to-br from-card to-paper/80 px-3.5 py-3 shadow-[0_1px_0_rgba(12,35,64,0.04)]"
        >
          <p className="text-[11px] font-medium tracking-wide text-muted">{item.label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-ink">{item.value}</p>
          {item.hint ? <p className="mt-0.5 text-[11px] text-muted">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
