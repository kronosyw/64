import { Suspense } from "react";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import { ScheduleBoard } from "@/components/ScheduleBoard";
import { EmptyState, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { canEditSchedule, canViewMemo } from "@/lib/roles";
import { pickBranchId, requireSession } from "@/lib/session";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; year?: string; month?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year || now.getFullYear());
  const month = Number(params.month || now.getMonth() + 1);
  const requested = params.branchId ? Number(params.branchId) : null;
  const branchId = pickBranchId(session.user.branchIds, requested);

  const branches = branchId
    ? await prisma.branch.findMany({
        where: { id: { in: session.user.branchIds }, isActive: true },
        orderBy: { name: "asc" },
      })
    : [];
  const current = branches.find((b) => b.id === branchId) || branches[0];

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const canSwitchBranch = session.user.role === "OWNER" || session.user.role === "SUPERADMIN";

  return (
    <>
      <PageHeader
        title="일정관리"
        description={`${year}년 ${month}월`}
        actions={
          <>
            {canSwitchBranch ? (
              <Suspense>
                <BranchSwitcher
                  branches={branches.map((b) => ({ id: b.id, name: b.name }))}
                  currentBranchId={branchId}
                />
              </Suspense>
            ) : (
              <div className="text-sm text-muted">지점: {current?.name ?? "-"}</div>
            )}
            <a
              className="rounded-btn border border-line bg-card px-2 py-1 text-sm text-ink"
              href={`/?branchId=${branchId}&year=${prevYear}&month=${prevMonth}`}
            >
              이전달
            </a>
            <a
              className="rounded-btn border border-line bg-card px-2 py-1 text-sm text-ink"
              href={`/?branchId=${branchId}&year=${nextYear}&month=${nextMonth}`}
            >
              다음달
            </a>
          </>
        }
      />

      {!branchId ? (
        <EmptyState>배정된 지점이 없습니다. 사장 계정에 지점을 배정하세요.</EmptyState>
      ) : (
        <ScheduleBoard
          branchId={branchId}
          year={year}
          month={month}
          canEdit={canEditSchedule(session.user.role)}
          showMemo={canViewMemo(session.user.role)}
        />
      )}
    </>
  );
}
