/** Lịch sử trạng thái của trang báo cáo (nút Quay lại / Tới): danh sách bản chụp và vị trí hiện tại. */
export type ViewerHistory<T> = Readonly<{ entries: readonly Readonly<{ id: string; value: T }>[]; index: number }>;

const MAX_ENTRIES = 50;

export const startHistory = <T>(value: T): ViewerHistory<T> => ({ entries: [{ id: JSON.stringify(value), value }], index: 0 });

/** Ghi trạng thái mới sau vị trí hiện tại (bỏ phần "Tới" cũ); trạng thái trùng với hiện tại thì không ghi (kể cả sau khi Quay lại / Tới). */
export function recordState<T>(history: ViewerHistory<T>, value: T): ViewerHistory<T> {
  const id = JSON.stringify(value);
  if (history.entries[history.index]?.id === id) return history;
  const kept = [...history.entries.slice(0, history.index + 1), { id, value }].slice(-MAX_ENTRIES);
  return { entries: kept, index: kept.length - 1 };
}

export const canGoBack = (history: ViewerHistory<unknown>) => history.index > 0;
export const canGoForward = (history: ViewerHistory<unknown>) => history.index < history.entries.length - 1;

/** Di chuyển `delta` bước (-1 lùi, +1 tới); ngoài phạm vi thì giữ nguyên. */
export function moveHistory<T>(history: ViewerHistory<T>, delta: -1 | 1): ViewerHistory<T> {
  const index = history.index + delta;
  return index < 0 || index >= history.entries.length ? history : { ...history, index };
}

export const currentState = <T>(history: ViewerHistory<T>): T => history.entries[history.index].value;
