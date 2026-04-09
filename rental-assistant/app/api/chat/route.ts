import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateConversation, addMessage, getMessages } from '@/lib/db';
import { streamChat } from '@/lib/assistant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, conversationId: existingConversationId } = body as {
      message: string;
      conversationId?: string;
    };

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'El mensaje es requerido' }, { status: 400 });
    }

    // Get or create conversation
    const conversation = existingConversationId
      ? { id: existingConversationId }
      : getOrCreateConversation('web');

    const conversationId = conversation.id;

    // Save user message
    addMessage(conversationId, 'user', message);

    // Build full message history for the assistant
    const dbMessages = getMessages(conversationId);
    const messages = dbMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Get streaming response from assistant
    const assistantStream = streamChat(messages, conversationId);

    // Create a TransformStream to pipe the data through
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Pipe assistant stream to response
    (async () => {
      const reader = assistantStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Conversation-Id': conversationId,
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
