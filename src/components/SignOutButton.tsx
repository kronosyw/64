"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50"
    >
      로그아웃
    </button>
  );
}
