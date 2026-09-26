// admin/app/api/analytics/stream/route.ts
import { getEventsSince } from "@/lib/events/eventQueries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let lastCheck = Date.now();
  let closed = false;
  let tickCount = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );

      send({ type: "connected", since: lastCheck });

      const tick = async () => {
        if (closed) return;
        tickCount++;
        try {
          const events = await getEventsSince(lastCheck, 50);
          const prev = lastCheck;
          lastCheck = Date.now();

          // 🔎 Log every tick so you can see the stream working in the terminal
          console.log(
            `[stream] tick #${tickCount} since=${new Date(prev).toISOString()} found=${events.length}`,
          );

          if (events.length > 0) {
            send({
              type: "events",
              events: JSON.parse(JSON.stringify(events)),
            });
          }
        } catch (err) {
          console.error("[stream] poll failed:", err);
          send({
            type: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      };

      const interval = setInterval(tick, 3000);
      await tick();

      request.signal.addEventListener("abort", () => {
        console.log(`[stream] closed after ${tickCount} ticks`);
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
