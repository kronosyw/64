"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui";

export function SignOutButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="border-line bg-card text-muted hover:border-ink/25 hover:text-ink"
    >
      로그아웃
    </Button>
  );
}
