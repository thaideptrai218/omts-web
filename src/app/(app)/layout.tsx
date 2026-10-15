import { AppSessionShell } from "@/features/auth/components/app-session-shell";

export default function ProtectedAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppSessionShell>{children}</AppSessionShell>;
}
