import { WorkType } from "@prisma/client";

const NAME_TO_TYPE: Record<string, WorkType> = {
  오픈: WorkType.OPEN,
  마감: WorkType.CLOSE,
  오픈마감: WorkType.OPEN_CLOSE,
  저녁PT: WorkType.EVENING_PT,
  풀타임PT: WorkType.FULL_PT,
  휴무: WorkType.OFF,
};

export function workTypeForShift(shift: { name: string; isOff: boolean }) {
  if (shift.isOff) return WorkType.OFF;
  return NAME_TO_TYPE[shift.name] ?? WorkType.OPEN;
}
