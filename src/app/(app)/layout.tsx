import { ServerApplicationBoundary } from "@/features/auth/components/server-application-boundary";

export default function ProtectedAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ServerApplicationBoundary>{children}</ServerApplicationBoundary>;
}
