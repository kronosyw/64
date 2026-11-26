"use client";

/** Lightweight SVG charts — Chart.js parity without extra dependency. */

export function BarChart({
  items,
  valueKey = "value",
  labelKey = "label",
  color = "#1a56db",
  height = 180,
}: {
  items: Array<Record<string, string | number>>;
  valueKey?: string;
  labelKey?: string;
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...items.map((i) => Number(i[valueKey] || 0)));
  const w = Math.max(320, items.length * 48);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" role="img">
      {items.map((item, idx) => {
        const v = Number(item[valueKey] || 0);
        const barH = (v / max) * (height - 40);
        const x = idx * 48 + 8;
        const y = height - 24 - barH;
        return (
          <g key={`${item[labelKey]}-${idx}`}>
            <rect x={x} y={y} width={32} height={barH} fill={color} rx={3} />
            <text x={x + 16} y={height - 8} textAnchor="middle" fontSize="9" fill="#6b7280">
              {String(item[labelKey] || "").slice(0, 6)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({
  items,
  valueKey = "value",
  labelKey = "label",
  color = "#1a56db",
  height = 180,
}: {
  items: Array<Record<string, string | number>>;
  valueKey?: string;
  labelKey?: string;
  color?: string;
  height?: number;
}) {
  if (items.length === 0) return <p className="text-sm text-muted">데이터 없음</p>;
  const max = Math.max(1, ...items.map((i) => Number(i[valueKey] || 0)));
  const w = Math.max(320, items.length * 28);
  const points = items
    .map((item, idx) => {
      const x = (idx / Math.max(1, items.length - 1)) * (w - 24) + 12;
      const y = height - 28 - (Number(item[valueKey] || 0) / max) * (height - 48);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" role="img">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      {items.map((item, idx) => {
        const x = (idx / Math.max(1, items.length - 1)) * (w - 24) + 12;
        const y = height - 28 - (Number(item[valueKey] || 0) / max) * (height - 48);
        return <circle key={idx} cx={x} cy={y} r="2.5" fill={color} />;
      })}
      {items.map((item, idx) => {
        if (items.length > 14 && idx % 3 !== 0) return null;
        const x = (idx / Math.max(1, items.length - 1)) * (w - 24) + 12;
        return (
          <text key={`l-${idx}`} x={x} y={height - 8} textAnchor="middle" fontSize="8" fill="#6b7280">
            {String(item[labelKey] || "").slice(-5)}
          </text>
        );
      })}
    </svg>
  );
}

export function DonutChart({
  items,
  height = 180,
}: {
  items: Array<{ label: string; value: number; color?: string }>;
  height?: number;
}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const colors = ["#1a56db", "#2AC1BC", "#E31837", "#e8a317", "#64748b"];
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 140 140" width={height} height={height} role="img">
        <g transform="translate(70,70)">
          {items.map((item, idx) => {
            const len = (item.value / total) * c;
            const el = (
              <circle
                key={item.label}
                r={r}
                fill="transparent"
                stroke={item.color || colors[idx % colors.length]}
                strokeWidth="18"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90)"
              />
            );
            offset += len;
            return el;
          })}
        </g>
      </svg>
      <ul className="space-y-1 text-sm">
        {items.map((item, idx) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: item.color || colors[idx % colors.length] }}
            />
            {item.label}: {Math.round(item.value)}
          </li>
        ))}
      </ul>
    </div>
  );
}
