import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ToastProvider } from "@/components/ui/toast-provider";
import { AuthProvider } from "@/features/auth/state/auth-provider";
import { ProfileEditor } from "@/features/profile/components/profile-editor";
import { createMockPersonalProfileEnvironment } from "@/features/profile/repositories/mock-personal-profile-environment";
import type { PersonalProfile } from "@/features/profile/domain/personal-profile";

const profile: PersonalProfile = {
  accountId: "account-render-test", username: "qa.user", displayName: "Tên kiểm thử",
  email: null, phone: null, recordVersion: "opaque-version", roles: [],
};

function renderProfile(input: PersonalProfile) {
  const environment = createMockPersonalProfileEnvironment({ initialProfile: input, latencyMs: 0 });
  return renderToStaticMarkup(
    <ToastProvider>
      <AuthProvider>
        <ProfileEditor
          onProfileChange={vi.fn()}
          profile={input}
          profileService={environment.profileService}
          verificationService={environment.verificationService}
        />
      </AuthProvider>
    </ToastProvider>,
  );
}

describe("profile editor nullable contact render", () => {
  it("renders absent contacts without crashing or inventing a number", () => {
    const html = renderProfile(profile);
    expect(html).toContain("Chưa thêm email");
    expect(html).toContain("Chưa thêm số điện thoại");
    expect(html).toContain("Thêm số điện thoại");
    expect(html).not.toContain("Đã xác minh");
  });

  it("keeps existing unverified contacts visible and editable", () => {
    const html = renderProfile({ ...profile, phone: { value: "+84900000000", isVerified: false } });
    expect(html).toContain("+84900000000");
    expect(html).toContain("Chưa xác minh");
    expect(html).toContain("Thay đổi số điện thoại");
  });
});
