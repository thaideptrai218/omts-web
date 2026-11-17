/**
 * Reads a whole amount of dong aloud in Vietnamese: 300000 -> "ba trăm nghìn đồng".
 * Used as a caption under large money fields so a missing zero is easy to spot.
 */
const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const SCALES = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

/** One group of up to three digits; `padded` keeps "không trăm" when the group is not the first spoken one. */
function readGroup(value: number, padded: boolean): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor(value / 10) % 10;
  const units = value % 10;
  const words: string[] = [];
  if (hundreds > 0 || padded) words.push(DIGITS[hundreds], "trăm");
  if (tens > 1) words.push(DIGITS[tens], "mươi");
  else if (tens === 1) words.push("mười");
  else if (units > 0 && (hundreds > 0 || padded)) words.push("lẻ");
  if (units > 0) {
    if (tens > 1 && units === 1) words.push("mốt");
    else if (tens >= 1 && units === 5) words.push("lăm");
    else words.push(DIGITS[units]);
  }
  return words.join(" ");
}

export function vndInWords(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  const whole = Math.round(Math.abs(amount));
  if (whole === 0) return "không đồng";
  const groups: number[] = [];
  for (let rest = whole; rest > 0; rest = Math.floor(rest / 1000)) groups.push(rest % 1000);
  const parts: string[] = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    if (groups[index] === 0) continue;
    const spoken = readGroup(groups[index], parts.length > 0);
    parts.push(SCALES[index] ? `${spoken} ${SCALES[index]}` : spoken);
  }
  return `${amount < 0 ? "âm " : ""}${parts.join(" ")} đồng`;
}
