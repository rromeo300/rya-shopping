#!/usr/bin/env node
// Script to configure Telegram webhook automatically
const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Load .env.local
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');

let envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) {
      envVars[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const TOKEN = envVars.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const SECRET = envVars.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET || 'rental_assistant_secret_2024';

if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN no encontrado en .env.local');
  process.exit(1);
}

console.log('\n=== Configurar Webhook de Telegram ===\n');
console.log('Necesitas la URL pública del túnel de Cloudflare.');
console.log('Ejemplo: https://abc-123-xyz.trycloudflare.com\n');

rl.question('Pega la URL del túnel (sin barra al final): ', (tunnelUrl) => {
  tunnelUrl = tunnelUrl.trim().replace(/\/$/, '');

  const webhookUrl = `${tunnelUrl}/api/telegram`;

  console.log(`\nConfigurando webhook en: ${webhookUrl}`);

  const apiUrl = `https://api.telegram.org/bot${TOKEN}/setWebhook`;
  const body = JSON.stringify({
    url: webhookUrl,
    secret_token: SECRET,
    allowed_updates: ['message', 'callback_query'],
  });

  const req = https.request(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const result = JSON.parse(data);
      if (result.ok) {
        console.log('\n✅ Webhook configurado correctamente!');
        console.log('\nAhora puedes hablar con tu bot en Telegram.');
        console.log('Busca tu bot y escríbele un mensaje.');
      } else {
        console.error('\n❌ Error:', result.description);
      }
      rl.close();
    });
  });

  req.on('error', err => {
    console.error('❌ Error de red:', err.message);
    rl.close();
  });

  req.write(body);
  req.end();
});
