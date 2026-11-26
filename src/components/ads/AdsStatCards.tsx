"use client";

import { ReactNode } from "react";
import { StatGrid } from "@/components/ui";

export function AdsStatCards({
  items,
  columns = 4,
}: {
  items: Array<{ label: string; value: ReactNode; hint?: string }>;
  columns?: 4 | 5;
}) {
  return <StatGrid items={items} columns={columns} />;
}
