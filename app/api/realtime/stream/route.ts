import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { realtimeBus, RealtimeEvent } from '@/lib/realtime/realtime-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const officeId = session.officeId;
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: any = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectMessage = `event: connected\ndata: ${JSON.stringify({
        status: 'CONNECTED',
        officeId,
        userId: session.userId,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));

      // Subscribe to real-time events for this office
      unsubscribe = realtimeBus.subscribe(officeId, (event: RealtimeEvent) => {
        try {
          const message = `event: message\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // stream might be closed
        }
      });

      // Keep-alive heartbeat every 25 seconds
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 25000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
