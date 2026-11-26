"use client";

export function AdsChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.id)}
              className={`desk-chip text-xs ${active ? "desk-chip-active" : "border border-line bg-card desk-chip-idle"}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
