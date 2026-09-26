// admin/app/api/analytics/stream/route.ts
import { getEventsSince } from "@/lib/events/eventQueries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Fluid Compute allows up to 300s on Hobby/Pro

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  // ✅ TransformStream lets us write chunks independently of the Response
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // ✅ Return the Response IMMEDIATELY — this establishes the connection
  const response = new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      // ✅ Disable compression for this route — Next.js buffers compressed streams
      "Content-Encoding": "none",
    },
  });

  // ✅ Start async work AFTER returning — runs in the background
  (async () => {
    let lastCheck = Date.now();
    let closed = false;

    const send = async (payload: unknown) => {
      if (closed) return;
      await writer.write(
        encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
      );
    };

    await send({ type: "connected", since: lastCheck });

    const tick = async () => {
      if (closed) return;
      try {
        const events = await getEventsSince(lastCheck, 50);
        lastCheck = Date.now();
        if (events.length > 0) {
          await send({
            type: "events",
            events: JSON.parse(JSON.stringify(events)),
          });
        }
      } catch (err) {
        console.error("[stream] poll failed:", err);
        await send({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    };

    const interval = setInterval(tick, 3000);
    await tick();

    request.signal.addEventListener("abort", () => {
      closed = true;
      clearInterval(interval);
      try {
        writer.close();
      } catch {}
    });
  })();

  return response; // ✅ Returned before the IIFE runs
}
