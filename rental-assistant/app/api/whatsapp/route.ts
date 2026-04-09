import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  return NextResponse.json({
    status: 'not_configured',
    message: 'La integración con WhatsApp aún no está configurada.',
    instructions: {
      title: 'Cómo conectar WhatsApp Business API',
      steps: [
        {
          step: 1,
          description: 'Crea una cuenta en Meta for Developers (developers.facebook.com)',
        },
        {
          step: 2,
          description: 'Crea una nueva app de tipo "Business" en el portal de Meta',
        },
        {
          step: 3,
          description: 'Agrega el producto "WhatsApp" a tu app',
        },
        {
          step: 4,
          description: 'Obtén tu número de teléfono de prueba y el token de acceso',
        },
        {
          step: 5,
          description:
            'Configura el webhook URL a: https://tu-dominio.com/api/whatsapp con el token de verificación de tu elección',
        },
        {
          step: 6,
          description: 'Agrega las variables de entorno: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN',
        },
        {
          step: 7,
          description: 'Implementa la lógica de recepción y envío de mensajes en este endpoint',
        },
      ],
      environment_variables: [
        { name: 'WHATSAPP_TOKEN', description: 'Token de acceso de la API de WhatsApp Business' },
        { name: 'WHATSAPP_PHONE_NUMBER_ID', description: 'ID del número de teléfono de WhatsApp Business' },
        { name: 'WHATSAPP_VERIFY_TOKEN', description: 'Token de verificación del webhook' },
      ],
      documentation: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    },
  });
}

export async function GET(req: NextRequest) {
  // WhatsApp webhook verification
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json(
    {
      message: 'Endpoint de WhatsApp. Configura tu webhook en Meta for Developers.',
      status: 'not_configured',
    },
    { status: 200 }
  );
}
