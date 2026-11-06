import { InboxDetailScreen } from "@/features/inbox-api/inbox-screens";
export default async function NotificationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; unreadOnly?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const value = Number(query.page);
  return <InboxDetailScreen id={id} page={Number.isInteger(value) && value > 0 && value < 1_000_000 ? value : 1} unreadOnly={query.unreadOnly === "true"} />;
}
