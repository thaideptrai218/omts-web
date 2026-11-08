import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RecoveryFlowShell } from "@/features/account-recovery/components/recovery-flow-shell";

describe("RecoveryFlowShell", () => {
  it("renders the linear process without clickable step navigation", () => {
    const markup = renderToStaticMarkup(
      <RecoveryFlowShell
        activeStep="verification"
        description="Mô tả bước"
        title="Xác minh"
      >
        <p>Nội dung bước</p>
      </RecoveryFlowShell>,
    );

    expect(markup).toContain("Tiến trình khôi phục tài khoản");
    expect(markup).toContain("Thông tin");
    expect(markup).toContain("Xác minh");
    expect(markup).toContain("Mật khẩu mới");
    expect(markup.match(/aria-current="step"/g)).toHaveLength(1);
    expect(markup).not.toMatch(/<(button|a)\b/);
    expect(markup).toContain("Nội dung bước");
  });
});
