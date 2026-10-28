"use client";
import { useEffect, useRef, useState } from "react";
import type { RaftFailure, RaftMutationResult } from "../domain/raft";

export function raftFailureText(result: RaftFailure): string {
  switch (result.status) {
    case "forbidden":
      return "Bạn không còn quyền thực hiện thao tác này. Vui lòng kiểm tra lại tài khoản.";
    case "not-found":
      return "Không tìm thấy bè. Nội dung đang nhập vẫn được giữ lại.";
    case "conflict":
      return "Hồ sơ đã thay đổi ở lượt thao tác khác. Bản nháp được giữ lại; đóng hồ sơ và tải lại danh sách để kiểm tra trước khi lưu.";
    case "zone-unavailable":
      return "Vùng nuôi đã ngừng sử dụng hoặc không còn tồn tại. Không thể tạo hoặc khôi phục bè trong vùng này.";
    case "open-cycle":
      return "Bè còn chu kỳ nuôi đang mở. Chưa thể thay đổi sơ đồ hoặc ngừng sử dụng.";
    case "invalid-status":
      return "Trạng thái bè đã thay đổi. Vui lòng tải lại hồ sơ để kiểm tra.";
    case "duplicate":
      return "Mã bè đã tồn tại trong vùng này. Hãy nhập mã khác.";
    case "lanes-in-use":
      return `Làn ${result.laneNumbers.join(", ")} đã có dữ liệu nuôi. Không thể xóa làn đã được sử dụng.`;
    case "invalid-photo":
      return "Chọn ảnh JPEG hoặc PNG không quá 10 MB. Nội dung tệp phải đúng định dạng ảnh.";
    case "invalid":
      return "Thông tin chưa hợp lệ. Vui lòng kiểm tra các ô đang nhập và sơ đồ làn nuôi.";
  }
}
export function useRaftMutation(
  onSaved: (result: Extract<RaftMutationResult, { status: "saved" }>) => void,
  onRejected?: (failure: RaftFailure) => void,
) {
  const active = useRef(true);
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function run(operation: () => Promise<RaftMutationResult>) {
    if (!active.current || locked.current) return;
    locked.current = true;
    setPending(true);
    setError("");
    try {
      const result = await operation();
      if (!active.current) return;
      if (result.status === "saved") onSaved(result);
      else {
        setError(raftFailureText(result));
        onRejected?.(result);
      }
    } catch {
      if (active.current)
        setError(
          "Chưa lưu được thay đổi. Nội dung đang nhập vẫn được giữ lại. Hãy kiểm tra kết nối và thử lại.",
        );
    } finally {
      locked.current = false;
      if (active.current) setPending(false);
    }
  }
  return {
    run,
    pending,
    error,
    clearError: () => setError(""),
    isLocked: () => locked.current,
  };
}
