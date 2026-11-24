import { EmployeeCategory, PayrollTaxType } from "@prisma/client";

/** 기존 64 급여 계산 규칙을 단순화해 재구현 */
export function calcPayrollItem(input: {
  category: EmployeeCategory;
  monthlySalary: number;
  actualHours: number;
  overtimeHours: number;
  workDays: number;
  taxType: PayrollTaxType;
  isFullAttendance: boolean;
}) {
  const { category, monthlySalary, actualHours, overtimeHours, workDays, taxType, isFullAttendance } =
    input;

  let basePay = 0;
  let overtimePay = 0;

  if (category === EmployeeCategory.FULL_TIME_4INS) {
    basePay = isFullAttendance ? monthlySalary : Math.round((monthlySalary / 209) * actualHours);
    overtimePay = Math.round((monthlySalary / 209) * 1.5 * overtimeHours);
  } else if (category === EmployeeCategory.BUSINESS_INCOME_33) {
    // 파트타임/사업소득: monthlySalary를 시급으로 취급
    basePay = Math.round(monthlySalary * actualHours);
    overtimePay = Math.round(monthlySalary * 1.5 * overtimeHours);
  } else {
    basePay = Math.round(monthlySalary * workDays);
    overtimePay = 0;
  }

  const totalPay = basePay + overtimePay;
  let taxAmount = 0;
  if (category === EmployeeCategory.FULL_TIME_4INS) {
    taxAmount = Math.round(totalPay * 0.093); // 간이 4대보험 공제율
  } else if (category === EmployeeCategory.BUSINESS_INCOME_33) {
    taxAmount = Math.round(totalPay * 0.033);
  } else {
    taxAmount = Math.round(totalPay * 0.033);
  }

  const netPay = taxType === PayrollTaxType.POST_TAX ? totalPay : totalPay - taxAmount;
  return { basePay, overtimePay, totalPay, taxAmount, netPay };
}
