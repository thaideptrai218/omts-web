import { Suspense } from "react";
import { CyclesRedirect } from "@/features/cycles-api/cycles-redirect";
import { Skeleton } from "@/features/operations/ui";

export const metadata = { title: "Chu kỳ nuôi" };
/** The cycle screen moved into the raft screen ("Chu kỳ nuôi" tab); old addresses and bookmarks are forwarded. */
export default function CyclesPage() { return <Suspense fallback={<Skeleton />}><CyclesRedirect /></Suspense>; }
