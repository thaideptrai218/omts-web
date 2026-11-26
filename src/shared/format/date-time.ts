const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Instant as `dd/mm/yyyy HH:mm` in Vietnam time (date first), or "—" when the value is not a valid instant. */
export function formatVietnameseDateTime(value: string): string {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return "—";
  const found = parts.formatToParts(time), part = (type: string) => found.find(item => item.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`;
}
