/** Lower-cases and strips Vietnamese diacritics so "thiet lap" finds "Thiết lập". */
export function foldVietnamese(text: string): string {
  return text.toLocaleLowerCase("vi").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d");
}
