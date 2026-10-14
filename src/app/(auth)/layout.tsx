export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
