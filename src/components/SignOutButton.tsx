"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-btn px-2.5 py-1.5 text-sm text-paper/80 hover:bg-paper/10 hover:text-paper"
    >
      로그아웃
    </button>
  );
}
