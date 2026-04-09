import { NextRequest, NextResponse } from 'next/server';
import { Bot } from 'grammy';
import { getOrCreateConversation } from '@/lib/db';
import { chat } from '@/lib/assistant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lazy bot initialization
let bot: Bot | null = null;

function getBot(): Bot {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN no está configurado');
    }
    bot = new Bot(token);
  }
  return bot;
}

export async function POST(req: NextRequest) {
  try {
    // Validate webhook secret
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incomingSecret = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (incomingSecret !== webhookSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json();

    // Extract message data from Telegram update
    const update = body as {
      message?: {
        chat: { id: number };
        from?: { id: number; first_name?: string; username?: string };
        text?: string;
      };
    };

    if (!update.message?.text) {
      // Not a text message, ignore
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const userId = String(update.message.from?.id ?? chatId);
    const userMessage = update.message.text;

    const telegramBot = getBot();

    // Send typing action
    await telegramBot.api.sendChatAction(chatId, 'typing');

    // Get or create conversation for this user
    const conversation = getOrCreateConversation('telegram', userId);

    // Get AI response (non-streaming)
    const response = await chat(userMessage, conversation.id);

    // Send response back to user
    await telegramBot.api.sendMessage(chatId, response, {
      parse_mode: 'Markdown',
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in Telegram webhook:', error);
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true });
  }
}
