import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  MurfTTS,
  CustomLLM,
} from 'agora-agents';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import { FIELD_TECH_SYSTEM_PROMPT } from '@/lib/field-tech-prompt';

// First thing the agent speaks via Murf Falcon TTS when technician connects.
const GREETING =
  'FieldTech Copilot online. You are assigned to Ticket T K T 409 at Substation Bay 4. How can I help you on site?';

// agentUid identifies the AI in the RTC channel and shares its default with the client.
const agentUid = String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---
    const body = (await request.json()) as ClientStartRequest;
    const { requester_id, channel_name } = body;

    // Validate required env vars
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    // --- 2. Build and start the agent ---
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    const publicUrl =
      process.env.APP_PUBLIC_URL || 'https://nautical-glorifier-swerve.ngrok-free.dev';
    const llmUrl = `${publicUrl}/api/chat/completions`;
    const llmApiKey =
      process.env.CUSTOM_LLM_AUTH_TOKEN || 'fieldtech-secret-token';
    const llmModel = process.env.LLM_MODEL || 'gemini-2.5-flash';

    // Pipeline: Deepgram STT → Custom Agentic LLM SSE → Murf Falcon TTS.
    const agent = new Agent({
      client,
      instructions: FIELD_TECH_SYSTEM_PROMPT,
      greeting: GREETING,
      failureMessage:
        'I hit a brief connection snag reaching the enterprise system. Could you repeat that?',
      maxHistory: 20,
      // VAD controls how the agent detects the start and end of speech for natural barge-in.
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160,
              prefix_padding_ms: 300,
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: 480,
            },
          },
        },
      },
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      parameters: {
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new DeepgramSTT({
          model: 'nova-3',
          language: 'en',
        }),
      )
      .withLlm(
        new CustomLLM({
          url: llmUrl,
          apiKey: llmApiKey,
          model: llmModel,
          greetingMessage: GREETING,
          failureMessage:
            'I hit a brief connection snag reaching the enterprise system. Could you repeat that?',
          maxHistory: 20,
        }),
      )
      .withTts(
        new MurfTTS({
          key: process.env.MURF_API_KEY || '',
          voiceId: process.env.MURF_VOICE_ID || 'Matthew',
          model: process.env.MURF_MODEL || 'FALCON',
          locale: process.env.MURF_LOCALE || 'en-US',
          baseUrl: 'wss://global.api.murf.ai/v1/speech/stream-input',
          sampleRate: 24000,
          rate: 0,
          pitch: 0,
        }),
      );

    // remoteUids restricts the agent to only process audio from this technician
    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 60,
      expiresIn: ExpiresIn.hours(1),
      debug: false,
    });

    const agentId = await session.start();

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
