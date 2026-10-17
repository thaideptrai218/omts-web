import type { PersonalProfile } from "@/features/profile/domain/personal-profile";
import { ProfileEditor } from "@/features/profile/components/profile-editor";

export function ProfileOverview({
  onProfileChange,
  profile,
}: {
  onProfileChange(profile: PersonalProfile): void;
  profile: PersonalProfile;
}) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary">Tài khoản của tôi</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          Hồ sơ cá nhân
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
          Kiểm tra thông tin đăng nhập và cập nhật cách mọi người nhìn thấy tên của bạn.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          aria-labelledby="profile-details-title"
          className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7"
        >
          <div className="border-b border-border pb-5">
            <h2 className="text-xl font-semibold text-text" id="profile-details-title">
              Thông tin cá nhân
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Email và số điện thoại mới cần được xác minh trước khi thay thế giá trị hiện tại.
            </p>
          </div>

          <div className="mt-5">
            <ProfileEditor onProfileChange={onProfileChange} profile={profile} />
          </div>
        </section>

        <aside className="space-y-4" aria-label="Thông tin tài khoản chỉ đọc">
          <section className="rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="text-lg font-semibold text-text">Thông tin đăng nhập</h2>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-sm font-semibold text-text-muted">
                  Tên đăng nhập
                </dt>
                <dd className="mt-1 break-all font-medium text-text">
                  {profile.username}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-text-muted">
                  Vai trò và phạm vi
                </dt>
                <dd className="mt-2 space-y-2">
                  {profile.roles.map((role) => (
                    <div
                      className="rounded-control bg-primary-soft px-3 py-2 text-sm text-primary-hover"
                      key={`${role.roleLabel}-${role.scopeLabel ?? "no-scope"}`}
                    >
                      <p className="font-semibold">{role.roleLabel}</p>
                      {role.scopeLabel && <p className="mt-0.5">{role.scopeLabel}</p>}
                    </div>
                  ))}
                </dd>
              </div>
            </dl>
          </section>

          <p className="rounded-control border border-info/20 bg-sky-50 p-4 text-sm leading-6 text-info">
            Tên đăng nhập, vai trò và phạm vi do hệ thống quản lý nên không chỉnh sửa tại đây.
          </p>
        </aside>
      </div>
    </div>
  );
}
