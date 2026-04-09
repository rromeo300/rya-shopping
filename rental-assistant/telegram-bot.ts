// Telegram bot in polling mode — no webhook or tunnel needed
// Run with: npx ts-node telegram-bot.ts  OR  node telegram-bot.js (after build)
import fs from 'fs';
import path from 'path';
import { Bot } from 'grammy';
import { getOrCreateConversation, addMessage } from './lib/db';
import { chat } from './lib/assistant';

// Load .env.local so the bot works regardless of how PM2 launches it
(function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  try {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([^#=][^=]*)=(.+)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch { /* .env.local not found, rely on system env */ }
})();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN no está configurado en .env.local');
  process.exit(1);
}

const bot = new Bot(token);

// Handle text messages
bot.on('message:text', async (ctx) => {
  const userId = String(ctx.from?.id);
  const userMessage = ctx.message.text;
  const userName = ctx.from?.first_name ?? 'Usuario';

  console.log(`[${new Date().toLocaleTimeString()}] ${userName}: ${userMessage}`);

  // Show typing indicator
  await ctx.replyWithChatAction('typing');

  try {
    // Get or create conversation for this user
    const conversation = getOrCreateConversation('telegram', userId);

    // Save user message
    addMessage(conversation.id, 'user', userMessage);

    // Get AI response
    const response = await chat(userMessage, conversation.id);

    // Save assistant response
    addMessage(conversation.id, 'assistant', response);

    console.log(`[${new Date().toLocaleTimeString()}] Asistente: ${response.substring(0, 80)}...`);

    // Send response (split if too long for Telegram's 4096 char limit)
    if (response.length <= 4096) {
      await ctx.reply(response, { parse_mode: 'Markdown' });
    } else {
      const chunks = response.match(/[\s\S]{1,4000}/g) || [response];
      for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: 'Markdown' });
      }
    }
  } catch (error) {
    console.error('Error:', error);
    await ctx.reply('Lo siento, ocurrió un error. Intenta de nuevo.');
  }
});

// Start command
bot.command('start', async (ctx) => {
  await ctx.reply(
    '¡Hola! Soy tu asistente de propiedades 🏠\n\n' +
    'Puedo ayudarte con:\n' +
    '• Gestionar tus propiedades e inquilinos\n' +
    '• Registrar solicitudes de mantenimiento\n' +
    '• Llevar el control de pagos\n' +
    '• Crear recordatorios\n' +
    '• Generar reportes financieros\n\n' +
    '¿En qué puedo ayudarte hoy?'
  );
});

// Start polling
console.log('🤖 Bot de Telegram iniciado en modo polling...');
console.log('✅ Listo para recibir mensajes');
bot.start({
  onStart: () => console.log(`🟢 Bot activo: @${bot.botInfo?.username ?? 'tu_bot'}`),
});
