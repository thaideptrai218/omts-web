import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { RecoveryChannelSelector } from "@/features/account-recovery/components/recovery-channel-selector";

describe("RecoveryChannelSelector", () => {
  it("renders one selected native radio in a labelled group", () => {
    const markup = renderToStaticMarkup(
      <RecoveryChannelSelector onChange={vi.fn()} value="email" />,
    );

    expect(markup).toContain("Cách nhận mã");
    expect(markup.match(/type="radio"/g)).toHaveLength(2);
    expect(markup.match(/name="recovery-channel"/g)).toHaveLength(2);
    expect(markup.match(/checked=""/g)).toHaveLength(1);
  });
});
