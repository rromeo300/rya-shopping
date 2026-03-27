import Anthropic from '@anthropic-ai/sdk';
import { propertyTools, executeToolCall } from './tools';
import { addMessage, getMessages, getMemoryContext } from './db';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BASE_SYSTEM_PROMPT = `Eres un asistente inteligente para gestión de propiedades en renta. \
El negocio incluye propiedades en Airbnb y renta directa. \
Ayudas a gestionar inquilinos, mantenimiento, pagos, recordatorios, gastos, ingresos e inventarios. \
Siempre respondes en español de manera profesional y concisa.

CAPACIDADES:
- Consultar, crear y actualizar propiedades, inquilinos, mantenimiento, pagos y recordatorios
- Registrar y analizar gastos por propiedad y categoría
- Registrar ingresos de Airbnb y renta directa, comparar fuentes
- Gestionar inventario de artículos por propiedad
- Aprender y recordar preferencias del usuario usando save_memory

AUTO-MEJORA:
Cuando el usuario mencione algo importante sobre su negocio, sus preferencias o datos clave \
(ej: "siempre cobro el día 5", "mi plomero se llama Juan", "prefiero reportes en pesos"), \
DEBES guardar esa información con la herramienta save_memory para recordarlo en futuras conversaciones.

Hoy es ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

function getSystemPrompt(): string {
  const memoryContext = getMemoryContext();
  return BASE_SYSTEM_PROMPT + memoryContext;
}

type MessageParam = Anthropic.MessageParam;

/**
 * Streaming version for the web chat interface.
 * Handles the full agentic loop (tool calls) and streams text chunks.
 */
export function streamChat(
  messages: { role: string; content: string }[],
  conversationId: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Build message history from DB + current messages
        const anthropicMessages: MessageParam[] = messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        let fullAssistantText = '';
        let continueLoop = true;

        while (continueLoop) {
          const response = await anthropic.messages.create({
            model: 'claude-opus-4-6',
            max_tokens: 16000,
            thinking: { type: 'adaptive' },
            system: getSystemPrompt(),
            tools: propertyTools,
            messages: anthropicMessages,
            stream: true,
          });

          // Collect blocks from streaming response
          let currentText = '';
          const toolUseBlocks: Array<{
            id: string;
            name: string;
            input: Record<string, unknown>;
          }> = [];
          let currentToolUse: { id: string; name: string; inputJson: string } | null = null;
          let stopReason: string | null = null;

          for await (const event of response) {
            if (event.type === 'content_block_start') {
              if (event.content_block.type === 'tool_use') {
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  inputJson: '',
                };
              }
            } else if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                currentText += event.delta.text;
                // Stream text chunks to client
                controller.enqueue(encoder.encode(event.delta.text));
              } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
                currentToolUse.inputJson += event.delta.partial_json;
              }
            } else if (event.type === 'content_block_stop') {
              if (currentToolUse) {
                try {
                  const input = JSON.parse(currentToolUse.inputJson || '{}');
                  toolUseBlocks.push({
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input,
                  });
                } catch {
                  toolUseBlocks.push({
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input: {},
                  });
                }
                currentToolUse = null;
              }
            } else if (event.type === 'message_delta') {
              stopReason = event.delta.stop_reason ?? null;
            }
          }

          if (currentText) {
            fullAssistantText += currentText;
          }

          if (stopReason === 'tool_use' && toolUseBlocks.length > 0) {
            // Build assistant message with all content blocks
            const assistantContent: Anthropic.Messages.ContentBlockParam[] = [];

            if (currentText) {
              assistantContent.push({ type: 'text', text: currentText });
            }

            for (const tool of toolUseBlocks) {
              assistantContent.push({
                type: 'tool_use',
                id: tool.id,
                name: tool.name,
                input: tool.input,
              });
            }

            anthropicMessages.push({
              role: 'assistant',
              content: assistantContent,
            });

            // Execute tool calls and build tool results
            const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((tool) => {
              const result = executeToolCall(tool.name, tool.input);
              return {
                type: 'tool_result' as const,
                tool_use_id: tool.id,
                content: result,
              };
            });

            anthropicMessages.push({
              role: 'user',
              content: toolResults,
            });

            // Continue the loop
          } else {
            // end_turn or other stop reason
            continueLoop = false;
          }
        }

        // Save assistant message to DB
        if (fullAssistantText && conversationId) {
          addMessage(conversationId, 'assistant', fullAssistantText);
        }

        controller.close();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        controller.enqueue(encoder.encode(`\n\nError: ${errorMsg}`));
        controller.close();
      }
    },
  });

  return stream;
}

/**
 * Non-streaming version for Telegram/WhatsApp bots.
 * Runs the full agentic loop and returns the final text response.
 */
export async function chat(message: string, conversationId: string): Promise<string> {
  // Load conversation history from DB
  const dbMessages = getMessages(conversationId);
  const anthropicMessages: MessageParam[] = dbMessages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Add the new user message
  anthropicMessages.push({ role: 'user', content: message });
  addMessage(conversationId, 'user', message);

  let finalText = '';
  let continueLoop = true;

  while (continueLoop) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8096,
      system: getSystemPrompt(),
      tools: propertyTools,
      messages: anthropicMessages,
    });

    // Extract text content
    const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text');
    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

    const currentText = textBlocks.map((b) => b.text).join('');

    if (response.stop_reason === 'tool_use' && toolUseBlocks.length > 0) {
      // Add assistant message
      anthropicMessages.push({
        role: 'assistant',
        content: response.content,
      });

      // Execute tools and build results
      const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((tool) => {
        const result = executeToolCall(tool.name, tool.input as Record<string, unknown>);
        return {
          type: 'tool_result' as const,
          tool_use_id: tool.id,
          content: result,
        };
      });

      anthropicMessages.push({
        role: 'user',
        content: toolResults,
      });
    } else {
      finalText = currentText;
      continueLoop = false;
    }
  }

  // Save the assistant response
  if (finalText) {
    addMessage(conversationId, 'assistant', finalText);
  }

  return finalText;
}
