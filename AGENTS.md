# AGENTS.md — FieldTech Copilot (Agora + Murf AI Hackathon Build)
> **For AI coding agents (Antigravity, Gemini Flash, Claude):** Read this FIRST before touching any code.
> This file governs all AI-assisted development on this repository.

## Quick Navigation
| Document | Location | Purpose |
|----------|----------|---------|
| Implementation Code | [`docs/IMPLEMENTATION.md`](./docs/IMPLEMENTATION.md) | Full TypeScript for all 8 files |
| Build Plan | [`docs/BUILD_PLAN.md`](./docs/BUILD_PLAN.md) | Milestone sequencing & git flow |
| Demo Script | [`docs/DEMO_SCRIPT.md`](./docs/DEMO_SCRIPT.md) | 5-stage voice demo commands |
| Spec / Requirements | [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Full product spec |

---

## 0. Project Identity

**Name:** FieldTech Copilot  
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · pnpm  
**Base:** `AgoraIO-Conversational-AI/agent-quickstart-nextjs` (merged via upstream)  
**Purpose:** Voice-first Field Technician AI assistant for the "Voice AI at Work" hackathon track.

---

## 1. Files You Must Read Before Making Any Changes

```
app/api/generate-agora-token/route.ts   ← DO NOT MODIFY (token builder)
app/api/stop-conversation/route.ts      ← DO NOT MODIFY (teardown)
app/api/invite-agent/route.ts           ← READ before modifying (modify only tts + llm blocks)
lib/agora.ts                            ← READ to understand UID constants
lib/chat-completions.ts                 ← READ before modifying or creating SSE routes
components/ConversationComponent.tsx    ← READ to understand uid==="0" mapping
components/QuickstartConversationLayout.tsx ← READ before adding FieldOperationsConsole
```

---

## 2. Inviolable Rules (Never Break These)

### 2.1 Agora Core Preservation
- **DO NOT** modify `app/api/generate-agora-token/route.ts` — `buildTokenWithRtm` must remain intact.
- **DO NOT** modify `app/api/stop-conversation/route.ts` — agent teardown must work cleanly.
- **DO NOT** alter the `uid === "0"` agent speaker transcript mapping in `ConversationComponent.tsx`.
- **DO NOT** change shared UID constants in `lib/agora.ts`.
- **DO NOT** break mic track release logic.

### 2.2 Public URL Requirement
- **NEVER** hardcode `localhost` in `invite-agent/route.ts`. Always use `process.env.APP_PUBLIC_URL`.
- Agora Cloud calls our custom LLM endpoint from their servers — it must be internet-reachable.

### 2.3 Voice Safety
- All text streamed from `/api/chat/completions` will be spoken by Murf AI Falcon TTS.
- **NEVER** stream markdown, bullet points, numbered lists, code blocks, or special characters to Agora.
- The LLM system prompt enforces this — do not remove or weaken those instructions.

### 2.4 Mutation Guardrails
- `reserve_spare_part` and `update_work_order` tools require `confirmed: true`.
- If the LLM calls these without confirmation, the tool executor returns `CONFIRMATION_REQUIRED`.
- **DO NOT** bypass this check in `lib/agent-tools.ts`.

---

## 3. File Ownership Map

| File | Status | Rule |
|------|--------|------|
| `lib/field-store.ts` | NEW — create | Contains seed data and state mutations |
| `lib/agent-tools.ts` | NEW — create | Tool schemas + executors; no over-abstraction |
| `lib/field-tech-prompt.ts` | NEW — create | System prompt constant; voice-safe rules |
| `lib/chat-completions.ts` | MODIFY | Add tool-calling loop; preserve existing SSE helpers |
| `app/api/chat/completions/route.ts` | NEW — create | OpenAI SSE endpoint; `runtime = "nodejs"` |
| `app/api/invite-agent/route.ts` | MODIFY | Surgical: replace only `tts` and `llm` blocks |
| `app/api/field-state/route.ts` | NEW — create | GET state + POST reset |
| `components/FieldOperationsConsole.tsx` | NEW — create | Real-time dashboard; no RTC/RTM logic |
| `components/QuickstartConversationLayout.tsx` | MODIFY | Surgical: add right column only |
| `app/api/generate-agora-token/route.ts` | FROZEN | Never touch |
| `app/api/stop-conversation/route.ts` | FROZEN | Never touch |
| `components/ConversationComponent.tsx` | FROZEN | Never touch |
| `lib/agora.ts` | FROZEN | Never touch |

---

## 4. Verification Checkpoints

After EVERY milestone, run:
```bash
pnpm run typecheck
```
**Zero TypeScript errors required before moving to the next milestone.**

After Milestone 2 (SSE endpoint live):
```bash
curl -X POST http://localhost:3000/api/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fieldtech-secret-token" \
  -d '{"messages":[{"role":"user","content":"Pull up my ticket"}]}' \
  --no-buffer
```
Expected: Stream of `data: {...}` chunks → `data: [DONE]`

After Milestone 3 (UI):
- `pnpm dev` → open http://localhost:3000 → both columns render.

---

## 5. Murf AI Falcon TTS — Correct Payload Structure

The correct `tts` block for Agora's ConvoAI invite payload is:
```json
{
  "vendor": "murf",
  "credential_mode": "byok",
  "params": {
    "key": "<MURF_API_KEY>",
    "base_url": "wss://global.api.murf.ai/v1/speech/stream-input",
    "voice_id": "en-US-ken",
    "model": "FALCON",
    "locale": "en-US",
    "sample_rate": 24000,
    "rate": 0,
    "pitch": 0
  }
}
```
**Key gotchas:**
- `model` must be `"FALCON"` (uppercase), not `"falcon-2.1"` — that's the Murf REST API format.
- `key` (not `api_key`) is the field name inside `params`.
- `credential_mode: "byok"` is required.
- `sample_rate: 24000` matches Agora WebRTC audio pipeline.

---

## 6. Custom LLM SSE — Agora Protocol Requirements

Agora Cloud sends POST to `${APP_PUBLIC_URL}/api/chat/completions` with:
- `messages: Message[]` — conversation history
- `tools: Tool[]` — Agora may pass tools or our endpoint provides them
- Standard OpenAI request body format

Our endpoint must respond with strict SSE format:
```
data: {"id":"...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"hello"},"finish_reason":null}]}\n\n
data: [DONE]\n\n
```

**Critical:** Every line starts with `data: ` and ends with `\n\n`. Final line is exactly `data: [DONE]\n\n`.

---

## 7. Environment Variables Reference

```env
# Agora (DO NOT CHANGE NAMES)
NEXT_PUBLIC_AGORA_APP_ID=
NEXT_AGORA_APP_CERTIFICATE=
NEXT_AGORA_CUSTOMER_ID=
NEXT_AGORA_CUSTOMER_SECRET=

# Our additions
APP_PUBLIC_URL=                    # ngrok HTTPS URL or Vercel URL
MURF_API_KEY=                      # Murf AI dashboard API key
MURF_VOICE_ID=en-US-ken            # Murf voice (Falcon-compatible)
MURF_MODEL=FALCON                  # Uppercase — Murf Falcon model
MURF_LOCALE=en-US
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=                       # OpenAI API key
LLM_MODEL=gpt-4o-mini
CUSTOM_LLM_AUTH_TOKEN=fieldtech-secret-token
```

---

## 8. Demo Flow Summary (What Must Work by 12:30 PM)

1. User clicks Start → Agora agent joins → Murf Falcon speaks greeting ✓
2. User: "Pull up my ticket" → `get_assigned_ticket` runs → UI shows ticket ✓
3. User: "Error E-412 diagnostics" → `search_maintenance_manual` runs → Runbook appears ✓
4. User: "Reserve the fan" → `check_part_inventory` runs → agent asks confirmation ✓
5. User: "Yes go ahead" → `reserve_spare_part(confirmed=true)` runs → stock decrements → RSV badge ✓
6. User: "Generate service report" → `generate_service_report` runs → Report modal opens ✓

---

## 9. What NOT to Build (Save Time)

- ❌ Database (PostgreSQL, Redis, SQLite) — use in-memory singleton in `lib/field-store.ts`
- ❌ Authentication/login — not needed for demo
- ❌ Websocket custom implementation — Agora RTC/RTM handles all voice
- ❌ Email/SMS integration — `supervisorNotified: true` flag is sufficient
- ❌ Multiple LLM providers — single OpenAI-compatible endpoint is enough
- ❌ CI/CD — just push to GitHub main
- ❌ Tests — `pnpm run typecheck` is the only test gate

---

# Agora Base Technical Guidelines

## StrictMode Guard (`isReady`)

Both `useJoin` and `useLocalMicrophoneTrack` are gated by `isReady` to prevent double initialization in React StrictMode dev mode. The cleanup fires synchronously before any `setTimeout`, so only the real second mount's timer fires.

```tsx
const [isReady, setIsReady] = useState(false);
useEffect(() => {
  let cancelled = false;
  const id = setTimeout(() => {
    if (!cancelled) setIsReady(true);
  }, 0);
  return () => {
    cancelled = true;
    clearTimeout(id);
    setIsReady(false);
  };
}, []);
const { isConnected: joinSuccess } = useJoin(config, isReady);
const { localMicrophoneTrack } = useLocalMicrophoneTrack(isReady);
```

## Hook Ownership

- `useJoin` owns `client.leave()`; never call it manually.
- `useLocalMicrophoneTrack` owns track lifecycle; do not manually call `.close()`.
- `usePublish` owns publish state; mute with `track.setEnabled()` and do not manually unpublish.

## AgoraVoiceAI Init

Initialize `AgoraVoiceAI` from `agora-agent-client-toolkit` inside `ConversationComponent`, gated on `isReady && joinSuccess`.

```tsx
useEffect(() => {
  if (!isReady || !joinSuccess) return;
  // AgoraVoiceAI.init() is called here exactly once.
}, [isReady, joinSuccess]);
```

## Transcript and UI Mapping

- Manage `transcript` and `agentState` through `useState` plus `ai.on(TRANSCRIPT_UPDATED, ...)` and `ai.on(AGENT_STATE_CHANGED, ...)`.
- The toolkit uses `uid="0"` as a sentinel for the local user's speech. Remap that value to `client.uid` before passing messages into `QuickstartTranscriptPanel`, or user speech renders on the agent side.
- Include `INTERRUPTED` turns in `messageList`; filter only `IN_PROGRESS`.

## Anti-Patterns / What NOT To Do

- Do not call `client.leave()` manually; it breaks `useJoin` cleanup.
- Do not call `localMicrophoneTrack.close()` manually; it breaks hook ownership.
- Do not remove the `isReady` guard.
- Do not set `reactStrictMode: false` as a workaround.
- Do not replace `RtcTokenBuilder.buildTokenWithRtm` with an RTC-only token builder.
