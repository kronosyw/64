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
    <div role="group" aria-label="지점 선택" className="desk-toolbar max-w-full">
      {branches.map((b) => {
        const active = b.id === value;
        return (
          <button
            key={b.id}
            type="button"
            title={b.name}
            aria-pressed={active}
            onClick={() => onChange(b.id)}
            className={`desk-chip shrink-0 ${active ? "desk-chip-active" : "desk-chip-idle"}`}
          >
            {shortBranchLabel(b.name)}
          </button>
        );
      })}
    </div>
  );
}
