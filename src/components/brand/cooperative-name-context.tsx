"use client";
import { createContext, useContext, type ReactNode } from "react";

// Tên hợp tác xã lấy từ hồ sơ HTX trong Thiết lập (root layout đọc từ API rồi truyền xuống).
// Giá trị mặc định chỉ là chữ chung, không phải tên một HTX cụ thể.
const CooperativeNameContext = createContext("Hợp tác xã");

export function CooperativeNameProvider({ name, children }: Readonly<{ name: string; children: ReactNode }>) {
  return <CooperativeNameContext.Provider value={name}>{children}</CooperativeNameContext.Provider>;
}

export const useCooperativeName = () => useContext(CooperativeNameContext);

/** Chèn tên hợp tác xã vào văn bản của component máy chủ. */
export function CooperativeName() {
  return <>{useCooperativeName()}</>;
}
