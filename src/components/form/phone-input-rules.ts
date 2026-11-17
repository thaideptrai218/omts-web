/** Domestic phone entry shared by management forms; keep leading zeroes as text. */
export const vietnamesePhonePattern = /^0[0-9]{9}$/u;
export const vietnamesePhoneMessage = "Số điện thoại gồm đúng 10 chữ số, bắt đầu bằng 0.";
export const phoneInputProps = { type: "tel", inputMode: "numeric", maxLength: 10, pattern: "0[0-9]{9}" } as const;

/** Strip separators/letters on paste and limit numeric identifiers without coercing to a number. */
export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/[^0-9]/gu, "").slice(0, maxLength);
}

export function phoneInputValue(value: string): string {
  return digitsOnly(value, 10);
}

export function validVietnamesePhone(value: string): boolean {
  return vietnamesePhonePattern.test(value);
}
