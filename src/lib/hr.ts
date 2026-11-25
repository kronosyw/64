export function insuranceLabel(type: string | null | undefined) {
  if (type === "THREE_POINT_THREE") return "3.3%";
  return "4대보험";
}

export function categoryLabel(category: string | null | undefined) {
  if (category === "BUSINESS_INCOME_33") return "3.3%";
  return "4대보험";
}

export function payRateLabel(insuranceType: string | null | undefined) {
  return insuranceType === "THREE_POINT_THREE" ? "시급" : "월급";
}

export function toDateInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const raw = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  return raw;
}

export function parseOptionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return new Date(`${text}T00:00:00.000Z`);
}

export function healthCertTone(expire: string | Date | null | undefined) {
  if (!expire) return "muted" as const;
  const day = toDateInput(expire);
  const today = new Date();
  const expireDate = new Date(`${day}T00:00:00`);
  const diff = Math.ceil((expireDate.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
  if (diff < 0) return "danger" as const;
  if (diff <= 30) return "gold" as const;
  return "ink" as const;
}

export function maskSsn(ssn: string | null | undefined) {
  if (!ssn) return "-";
  const clean = ssn.replace(/\s/g, "");
  if (clean.length < 7) return clean;
  return `${clean.slice(0, 6)}-*******`;
}
