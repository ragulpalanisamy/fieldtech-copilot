declare namespace NodeJS {
  interface ProcessEnv {
    // Agora Core
    NEXT_PUBLIC_AGORA_APP_ID?: string;
    NEXT_AGORA_APP_CERTIFICATE?: string;
    NEXT_AGORA_CUSTOMER_ID?: string;
    NEXT_AGORA_CUSTOMER_SECRET?: string;

    // Public Tunnel / Webhook URL
    APP_PUBLIC_URL?: string;

    // Murf AI Falcon Real-Time TTS
    MURF_API_KEY?: string;
    MURF_VOICE_ID?: string;
    MURF_MODEL?: string;
    MURF_LOCALE?: string;

    // Custom LLM SSE Endpoint (OpenAI / Gemini OpenAI-compatible)
    LLM_API_URL?: string;
    LLM_API_KEY?: string;
    LLM_MODEL?: string;
    CUSTOM_LLM_AUTH_TOKEN?: string;

    [key: string]: string | undefined;
  }
}

declare const process: NodeJS.Process;
