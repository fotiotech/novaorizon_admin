// admin/app/(analytics)/analytics/live/page.tsx
import { getRecentEvents, getHotRightNow } from "@/app/actions/events";
import { LiveDashboard } from "../../_component/LiveDashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [recent, hot] = await Promise.all([
    getRecentEvents(200, 24 * 60 * 60 * 1000), // 200 events from the last 24h
    getHotRightNow(15 * 60 * 1000, 8),
  ]);

  return (
    <LiveDashboard
      initialEvents={JSON.parse(JSON.stringify(recent)).reverse()}
      initialHot={JSON.parse(JSON.stringify(hot))}
    />
  );
}
