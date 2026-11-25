import { EmployeeCategory, PayrollTaxType, Role } from "@prisma/client";

export function countWeekdays(year: number, month: number) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let count = 0;
  for (let day = 1; day <= days; day += 1) {
    const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (dow >= 1 && dow <= 5) count += 1;
  }
  return Math.max(count, 1);
}

export function calcTax4(pay: number) {
  const nationalPension = pay * 0.045;
  const health = pay * 0.03545;
  const longTerm = health * 0.1281;
  const employment = pay * 0.009;
  return Math.round(nationalPension + health + longTerm + employment);
}

export function calcTax33(pay: number) {
  const incomeTax = Math.floor((pay * 0.03) / 10) * 10;
  const localTax = Math.floor((incomeTax * 0.1) / 10) * 10;
  return incomeTax + localTax;
}

function hoursBetween(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}

/** 스케줄 → 실근무·근무일·초과시간 (휴게 1.5h / 초과 = hours − days×10) */
export function aggregateSchedules(
  schedules: Array<{
    workDate: Date | string;
    workType: string;
    startTime: string | null;
    endTime: string | null;
    workHours: unknown;
  }>,
) {
  let actualHours = 0;
  let workDays = 0;
  let offDays = 0;

  for (const schedule of schedules) {
    if (schedule.workType === "OFF") {
      offDays += 1;
      continue;
    }
    workDays += 1;
    const raw =
      schedule.workHours != null && Number(schedule.workHours) > 0
        ? Number(schedule.workHours)
        : hoursBetween(schedule.startTime, schedule.endTime);
    const date = typeof schedule.workDate === "string" ? new Date(schedule.workDate) : schedule.workDate;
    const dow = date.getUTCDay();
    const weekday = dow >= 1 && dow <= 5;
    const dayHours = weekday && raw > 5 ? Math.max(0, raw - 1.5) : raw;
    actualHours += dayHours;
  }

  actualHours = Math.round(actualHours * 100) / 100;
  const overtimeHours = Math.max(0, Math.round((actualHours - workDays * 10) * 100) / 100);
  return { actualHours, workDays, offDays, overtimeHours };
}

export function resolveCategory(role: Role | string, insuranceType: string) {
  if (role === Role.PARTTIME || role === "PARTTIME") return EmployeeCategory.BUSINESS_INCOME_33;
  if (insuranceType === "THREE_POINT_THREE") return EmployeeCategory.BUSINESS_INCOME_33;
  return EmployeeCategory.FULL_TIME_4INS;
}

export function calcPayrollItem(input: {
  category: EmployeeCategory;
  monthlySalary: number;
  actualHours: number;
  overtimeHours: number;
  workDays: number;
  weekMode?: number;
  year: number;
  month: number;
  taxType: PayrollTaxType;
  isFullAttendance: boolean;
  isPartTimeHourly?: boolean;
}) {
  const {
    category,
    monthlySalary,
    actualHours,
    overtimeHours,
    workDays,
    weekMode = 5,
    year,
    month,
    taxType,
    isFullAttendance,
    isPartTimeHourly = false,
  } = input;

  let basePay = 0;
  let overtimePay = 0;

  if (category === EmployeeCategory.FULL_TIME_4INS) {
    basePay = monthlySalary;
    overtimePay = 0;
  } else if (category === EmployeeCategory.BUSINESS_INCOME_33) {
    if (isPartTimeHourly) {
      basePay = Math.round(monthlySalary * actualHours);
      overtimePay = 0;
    } else {
      const divisor = weekMode === 6 ? 260 : 252;
      const ovtRate = Math.round(monthlySalary / divisor);
      if (isFullAttendance) {
        basePay = monthlySalary;
        overtimePay = Math.round(overtimeHours * ovtRate);
      } else {
        const weekdays = countWeekdays(year, month);
        const dailyRate = monthlySalary / weekdays;
        basePay = Math.round(workDays * dailyRate);
        overtimePay = Math.round(overtimeHours * ovtRate);
      }
    }
  } else {
    basePay = Math.round(monthlySalary * actualHours);
    overtimePay = 0;
  }

  const totalPay = basePay + overtimePay;
  const taxAmount =
    category === EmployeeCategory.FULL_TIME_4INS ? calcTax4(totalPay) : calcTax33(totalPay);
  const netPay = taxType === PayrollTaxType.POST_TAX ? totalPay : totalPay - taxAmount;

  return { basePay, overtimePay, totalPay, taxAmount, netPay };
}

