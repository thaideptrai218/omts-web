"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { useOperationEditor } from "@/features/operations/use-operation-editor";

/**
 * Close button for purchasing editors. While a write is blocked it explains that the draft is kept
 * and, when `readCurrent` is given, lets the user read a one-line summary of the saved record.
 */
export function EditorClose({
  editor,
  readCurrent,
}: {
  editor: ReturnType<typeof useOperationEditor>;
  readCurrent?: () => Promise<string | undefined>;
}) {
  const [current, setCurrent] = useState<string>();
  return (
    <>
      {editor.mutation.blocked && (
        <div className="my-4 space-y-3">
          <p className="text-sm">
            Bản nháp được giữ. Hãy đối chiếu kết quả trước khi lập lượt mới; hệ thống không tự gửi lại.
          </p>
          {readCurrent && (
            <Button variant="secondary" onClick={async () => setCurrent(await readCurrent())}>
              Đọc hồ sơ hiện tại
            </Button>
          )}
          {current && <p className="text-sm">{current}</p>}
        </div>
      )}
      <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>
        Đóng
      </Button>
    </>
  );
}
