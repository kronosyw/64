import { Suspense } from "react";
import { StaffLoginForm } from "@/components/StaffLoginForm";

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-paper text-foreground">
          로그인 준비 중...
        </div>
      }
    >
      <StaffLoginForm />
    </Suspense>
  );
}
