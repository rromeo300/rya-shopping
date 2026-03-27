// Server-Sent Events — pushes real-time WA updates to the browser
// The dashboard connects once and receives live updates without polling
import { getWAConversations, getWAStats, getWALabels } from '@/lib/db';

// Global set of connected SSE clients
const clients = new Set<ReadableStreamDefaultController>();

// Called by whatsapp-observer when something changes
export function notifyClients(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const ctrl of clients) {
    try { ctrl.enqueue(payload); } catch { clients.delete(ctrl); }
  }
}

export async function GET() {
  const encoder = new TextEncoder();
  let ctrl: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      ctrl = controller;
      clients.add(ctrl);

      // Send initial snapshot immediately
      const snapshot = {
        conversations: getWAConversations(false).map(c => ({
          ...c, labels: JSON.parse(c.labels || '[]'),
          archived: c.archived === 1, pinned: c.pinned === 1,
        })),
        stats: getWAStats(),
        labels: getWALabels(),
      };
      ctrl.enqueue(encoder.encode(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`));

      // Heartbeat every 25s to keep connection alive
      const hb = setInterval(() => {
        try { ctrl.enqueue(encoder.encode(': heartbeat\n\n')); }
        catch { clearInterval(hb); clients.delete(ctrl); }
      }, 25000);

      return () => { clearInterval(hb); clients.delete(ctrl); };
    },
    cancel() { clients.delete(ctrl); },
  });

  // Re-encode string chunks as Uint8Array
  const textStream = new TransformStream<string, Uint8Array>({
    transform(chunk, controller) { controller.enqueue(encoder.encode(chunk)); },
  });

  return new Response(stream.pipeThrough(textStream as never), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
