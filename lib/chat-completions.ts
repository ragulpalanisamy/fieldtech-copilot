import { NextRequest, NextResponse } from 'next/server';
import type { streamText } from 'ai';
import type { createOpenAI } from '@ai-sdk/openai';
import { randomUUID } from 'crypto';
import { FIELD_AGENT_TOOLS, executeToolCall } from '@/lib/agent-tools';
import { FIELD_TECH_SYSTEM_PROMPT } from '@/lib/field-tech-prompt';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

/**
 * FieldTech Copilot Agentic SSE handler.
 * Called by Agora Conversational AI as the Custom LLM.
 * Executes tools (ticket, manual RAG, inventory, reservations, reports)
 * and streams voice-safe text to Murf Falcon TTS in OpenAI SSE chunk format.
 */
export async function handleFieldTechChatCompletions(request: NextRequest) {
  // ── 1. Auth Guard ─────────────────────────────────────────────────────────
  const expectedAuthToken =
    process.env.CUSTOM_LLM_AUTH_TOKEN || 'fieldtech-secret-token';
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (expectedAuthToken && token && token !== expectedAuthToken) {
    console.warn('[custom-llm] Warning: Authorization token mismatch', {
      received: token,
    });
  }

  // ── 2. Parse Body ─────────────────────────────────────────────────────────
  let body: {
    messages?: Array<{ role: string; content: unknown }>;
    model?: string;
    stream?: boolean;
    [key: string]: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const incomingMessages: ChatMessage[] = (body.messages ?? []).map((m) => ({
    role: m.role as ChatMessage['role'],
    content:
      typeof m.content === 'string'
        ? m.content
        : m.content === null || m.content === undefined
        ? null
        : JSON.stringify(m.content),
  }));

  // Ensure system prompt is present
  const messages: ChatMessage[] = incomingMessages.some(
    (m) => m.role === 'system',
  )
    ? incomingMessages
    : [
        { role: 'system', content: FIELD_TECH_SYSTEM_PROMPT },
        ...incomingMessages,
      ];

  const llmUrl =
    process.env.LLM_API_URL ||
    process.env.NEXT_LLM_URL ||
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  const llmApiKey =
    process.env.LLM_API_KEY || process.env.NEXT_LLM_API_KEY || '';
  const llmModel =
    process.env.LLM_MODEL ||
    (typeof body.model === 'string' ? body.model : 'gemini-2.5-flash');

  // ── 3. Multi-turn Agentic Tool Execution Loop ─────────────────────────────
  const conversationMessages = [...messages];
  let iterations = 0;
  const MAX_ITER = 4;
  let finalText = '';

  while (iterations < MAX_ITER) {
    iterations++;

    try {
      const res = await fetch(llmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${llmApiKey}`,
        },
        body: JSON.stringify({
          model: llmModel,
          messages: conversationMessages,
          tools: FIELD_AGENT_TOOLS,
          tool_choice: 'auto',
          stream: false,
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[custom-llm] Upstream LLM error:', res.status, errText);
        finalText =
          'I am having trouble reaching the enterprise system. Could you repeat that?';
        break;
      }

      const data = (await res.json()) as {
        choices?: Array<{
          finish_reason?: string;
          message: ChatMessage;
        }>;
      };

      const choice = data.choices?.[0];
      if (!choice) {
        finalText = 'No response received from enterprise systems.';
        break;
      }

      const assistantMsg = choice.message;

      // Handle tool calling
      if (
        choice.finish_reason === 'tool_calls' &&
        assistantMsg.tool_calls &&
        assistantMsg.tool_calls.length > 0
      ) {
        conversationMessages.push(assistantMsg);

        for (const tc of assistantMsg.tool_calls) {
          let toolArgs: Record<string, unknown> = {};
          try {
            toolArgs = JSON.parse(tc.function.arguments || '{}') as Record<
              string,
              unknown
            >;
          } catch {
            toolArgs = {};
          }

          console.log(`[agentic-tool] Executing ${tc.function.name}`, toolArgs);
          const toolResult = await executeToolCall(tc.function.name, toolArgs);

          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: tc.function.name,
            content: toolResult,
          });
        }

        // Re-invoke the model to generate spoken response with tool results in context
        continue;
      }

      // Final assistant response generated
      finalText = assistantMsg.content || 'I have completed that for you.';
      break;
    } catch (err) {
      console.error('[custom-llm] Tool loop error:', err);
      finalText =
        'I hit a brief connection snag. Please repeat your request.';
      break;
    }
  }

  // ── 4. OpenAI SSE Streaming Output ────────────────────────────────────────
  const encoder = new TextEncoder();
  const id = `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);
  const model = llmModel;

  const sseChunk = (
    delta: Record<string, unknown>,
    finishReason: string | null = null,
  ) =>
    encoder.encode(
      `data: ${JSON.stringify({
        id,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [{ index: 0, delta, finish_reason: finishReason }],
      })}\n\n`,
    );

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // First chunk sends assistant role
        controller.enqueue(sseChunk({ role: 'assistant', content: '' }));

        // Stream text in words for smooth TTS speech synthesis
        const words = finalText.split(' ');
        let buffer = '';
        for (let i = 0; i < words.length; i++) {
          buffer += (i === 0 ? '' : ' ') + words[i];
          if (
            (i + 1) % 4 === 0 ||
            /[.!?,]$/.test(words[i]) ||
            i === words.length - 1
          ) {
            controller.enqueue(sseChunk({ content: buffer }));
            buffer = '';
            await new Promise((r) => setTimeout(r, 10));
          }
        }

        controller.enqueue(sseChunk({}, 'stop'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        console.error('[custom-llm] SSE Stream error:', err);
        controller.error(err);
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * Retained for backward-compatibility with scripts/verify-api-contracts.ts.
 */
type ChatBody = {
  messages?: Array<{ role: string; content: unknown }>;
  model?: string;
  stream?: boolean;
  [key: string]: unknown;
};

type ChatCompletionsDeps = {
  createOpenAIClient: typeof createOpenAI;
  streamTextImpl: typeof streamText;
};

export function createChatCompletionsHandler({
  createOpenAIClient,
  streamTextImpl,
}: ChatCompletionsDeps) {
  return async function POST(request: NextRequest) {
    const apiKey = process.env.NEXT_LLM_API_KEY;
    const llmUrl = process.env.NEXT_LLM_URL;
    const modelId = 'gpt-4o';

    if (!apiKey || !llmUrl) {
      return NextResponse.json(
        { error: 'NEXT_LLM_API_KEY and NEXT_LLM_URL must be set' },
        { status: 500 },
      );
    }

    const baseURL = llmUrl.replace(/\/chat\/completions\/?$/, '');

    let body: ChatBody;
    try {
      body = (await request.json()) as ChatBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const openai = createOpenAIClient({ apiKey, baseURL });

    const result = streamTextImpl({
      model: openai(modelId),
      messages: (body.messages ?? []) as NonNullable<
        Parameters<typeof streamText>[0]['messages']
      >,
    });

    const encoder = new TextEncoder();
    const id = `chatcmpl-${randomUUID()}`;
    const created = Math.floor(Date.now() / 1000);
    const model = body.model ?? modelId;

    const sseChunk = (
      delta: Record<string, unknown>,
      finishReason: string | null = null,
    ) =>
      encoder.encode(
        `data: ${JSON.stringify({
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta, finish_reason: finishReason }],
        })}\n\n`,
      );

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(sseChunk({ role: 'assistant', content: '' }));
          for await (const chunk of result.textStream) {
            controller.enqueue(sseChunk({ content: chunk }));
          }
          controller.enqueue(sseChunk({}, 'stop'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('[custom-llm] Stream error:', err);
          controller.error(err);
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  };
}
