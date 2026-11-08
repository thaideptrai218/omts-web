export function isDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText),
    month = Number(monthText),
    day = Number(dayText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
  );
}

export function vietnameseBusinessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatVietnameseDate(value: string): string {
  return isDateOnly(value) ? value.split("-").reverse().join("/") : value;
}

// Invalid or incomplete input stays visible so the form schema can explain it.
export function parseVietnameseDateInput(text: string): string {
  if (isDateOnly(text)) return text;
  const match =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text) ??
    /^(\d{2})(\d{2})(\d{4})$/.exec(text);
  if (!match) return text;
  const [, day, month, year] = match;
  const value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return isDateOnly(value) ? value : text;
}
