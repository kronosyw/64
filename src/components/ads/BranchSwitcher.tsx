"use client";

import { AdsBranch, shortBranchLabel } from "@/lib/ads-ui";

export function BranchSwitcher({
  branches,
  value,
  onChange,
}: {
  branches: AdsBranch[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  if (!branches.length) return null;
  return (
    <div
      role="group"
      aria-label="지점 선택"
      className="inline-flex max-w-full flex-wrap gap-1 rounded-btn border border-line bg-paper/70 p-1"
    >
      {branches.map((b) => {
        const active = b.id === value;
        return (
          <button
            key={b.id}
            type="button"
            title={b.name}
            aria-pressed={active}
            onClick={() => onChange(b.id)}
            className={`min-h-8 shrink-0 rounded-[0.55rem] px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${
              active
                ? "bg-ink text-paper shadow-sm"
                : "text-muted hover:bg-card hover:text-ink"
            }`}
          >
            {shortBranchLabel(b.name)}
          </button>
        );
      })}
    </div>
  );
}
