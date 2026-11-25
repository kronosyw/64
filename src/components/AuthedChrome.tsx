"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/AppShell";

export function AuthedChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname.startsWith("/login/")) return children;
  return <AppShell>{children}</AppShell>;
}
