# REQUIREMENTS.md — FieldTech Copilot (Voice-First Enterprise Field Service Agent)

## 1. Project Overview & Hackathon Context
- **Event:** Build with Agora – Bengaluru (Nov 21, 2026)
- **Track:** Voice AI at Work: Beyond the Call Center
- **Core Objective:** Build a real-time, voice-first **Field Technician Copilot** that assists on-site industrial/telecom technicians hands-free across the entire service lifecycle (**Before → During → Action → Confirm → Follow-Up**).
- **Mandatory Tech Stack:**
  1. **Base Repository:** `AgoraIO-Conversational-AI/agent-quickstart-nextjs` (Next.js App Router, TypeScript, Tailwind CSS, `pnpm`).
  2. **Voice & Signaling:** Agora Conversational AI Engine (RTC audio + RTM live transcripts, agent state, and `AGENT_METRICS`).
  3. **Text-to-Speech (TTS):** **Murf AI Falcon TTS** (`vendor: "murf"`, Falcon model, streaming WebSocket/REST integration via Agora ConvoAI).
  4. **Agentic Brain & Tool Calling:** Custom OpenAI-compatible SSE endpoint (`/api/chat/completions`) implementing multi-step tool calling, enterprise RAG/knowledge lookup, human-in-the-loop confirmation for critical actions, and live UI state synchronization.

---

## 2. Non-Negotiable Architectural Guardrails (For Coding Agent)
Before modifying any files, inspect `README.md`, `AGENTS.md`, `package.json`, `app/api/generate-agora-token/route.ts`, `app/api/invite-agent/route.ts`, `app/api/stop-conversation/route.ts`, `lib/chat-completions.ts`, and `components/ConversationComponent.tsx`.

1. **Preserve Core Agora Lifecycle:**
   - Do **NOT** break `RtcTokenBuilder.buildTokenWithRtm` in `app/api/generate-agora-token/route.ts`.
   - Do **NOT** alter the shared agent UID contract in `lib/agora.ts` or the `uid === "0"` transcript speaker mapping in `components/ConversationComponent.tsx`.
   - Preserve clean microphone track release and `/api/stop-conversation` teardown.
2. **Public Reachability for Custom LLM:**
   - Agora Cloud executes STT and TTS in the cloud and makes an HTTP POST request to our Custom LLM URL (`${process.env.APP_PUBLIC_URL}/api/chat/completions`).
   - Never hardcode `localhost` in the `llm.url` payload sent to Agora's `/join` endpoint; read it from `process.env.APP_PUBLIC_URL` (an `ngrok` HTTPS tunnel during local dev or Vercel URL in production).
3. **Voice-Optimized Responses:**
   - Every assistant text response streamed back to Agora TTS will be spoken aloud by Murf AI Falcon.
   - Instruct the LLM in its system prompt: **NEVER output Markdown tables, bullet symbols (`*`, `-`), raw JSON, code blocks, or special formatting in spoken replies.** Keep spoken responses concise (1–3 crisp sentences), natural, and conversational, while pushing rich structured data (tables, part numbers, fault trees, service reports) to the visual Field Console UI via state updates.

---

## 3. Environment Variables (`.env.local`)
Extend `env.local.example` and `.env.local` with the following keys (keep existing Agora variables untouched):

```env
# Existing Agora Variables (DO NOT REMOVE)
NEXT_PUBLIC_AGORA_APP_ID=
NEXT_AGORA_APP_CERTIFICATE=
NEXT_AGORA_CUSTOMER_ID=
NEXT_AGORA_CUSTOMER_SECRET=

# Public URL reachable by Agora Cloud (ngrok HTTPS URL locally, or Vercel URL)
APP_PUBLIC_URL=[https://your-tunnel.ngrok-free.dev](https://your-tunnel.ngrok-free.dev)

# Murf AI Falcon TTS Configuration
MURF_API_KEY=
MURF_VOICE_ID=en-US-ken
MURF_MODEL=falcon-2.1
MURF_LOCALE=en-US

# Custom LLM Provider (OpenAI-compatible endpoint used inside /api/chat/completions)
LLM_API_URL=[https://api.openai.com/v1/chat/completions](https://api.openai.com/v1/chat/completions)
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
CUSTOM_LLM_AUTH_TOKEN=fieldtech-secret-token
```

---

## 4. End-to-End Demo Scenario (The 5-Stage Judging Flow)
The application must reliably execute this complete, realistic industrial workflow in under 90 seconds during a live demo:

1. **Stage 1 — INITIATE & BEFORE (Context Retrieval):**
   - Technician clicks **Start Shift / Connect Copilot** and says: *"Hey Copilot, I'm on site at Substation Bay 4. Pull up my assigned ticket and check the unit's history."*
   - **Agent Action:** Calls `get_assigned_ticket(ticket_id="TKT-409")` → retrieves ticket details (5G Macro Baseband Unit `BBU-9000X`, overheating + intermittent backhaul drop), past maintenance logs, and safety lockout notice.
   - **UI Effect:** Left/Main dashboard highlights **Ticket TKT-409**, equipment specs, and safety checklist.
2. **Stage 2 — DURING (RAG Diagnostic Troubleshooting):**
   - Technician says: *"The unit is throwing error code E-412 and the intake fan is rattling. What's the diagnostic procedure?"*
   - **Agent Action:** Calls `search_maintenance_manual(equipment_model="BBU-9000X", error_code="E-412")` → retrieves exact OEM troubleshooting steps (thermal sensor threshold breach > 78°C caused by seized primary cooling fan assembly `FAN-90X-PRO`; requires thermal paste re-application + fan swap).
   - **UI Effect:** Diagnostic Runbook card appears on screen with step-by-step check items.
3. **Stage 3 — ACTION & CONFIRM (Inventory Check + Human-in-the-Loop Approval):**
   - Technician says: *"Check if we have the replacement fan assembly in van stock or the local warehouse, and reserve it."*
   - **Agent Action 1:** Calls `check_part_inventory(part_number="FAN-90X-PRO")` → finds `0` in Van #12, `4` units in **Bengaluru East Hub (Bin B-14, 15 mins away)**.
   - **Critical Action Guardrail:** Because reserving/ordering parts and updating live work orders are write operations, the agent **MUST ask for explicit verbal confirmation** before executing `create_part_reservation` or `update_ticket_status`:
     *"I found 4 units of FAN-90X-PRO at Bengaluru East Hub, Bin B-14. Should I reserve one unit for Ticket TKT-409 and mark the part status as awaiting pickup?"*
   - Technician confirms: *"Yes, go ahead and reserve it."*
   - **Agent Action 2:** Calls `reserve_spare_part(ticket_id="TKT-409", part_number="FAN-90X-PRO", warehouse="BLR-EAST-HUB", confirmed=true)` and `update_work_order(ticket_id="TKT-409", status="IN_PROGRESS_PART_RESERVED", notes="Confirmed E-412 fan seizure; reserved FAN-90X-PRO from BLR-EAST-HUB")`.
   - **UI Effect:** Inventory stock decrements from `4` to `3`, Reservation Badge `#RSV-8821` appears, and Ticket status badge flips live to `PART RESERVED`.
4. **Stage 4 — ERROR HANDLING (Graceful Recovery Demo):**
   - If technician asks for an invalid ticket (e.g., `"TKT-999"`) or an out-of-stock part (`"PSU-770"`), the tool returns a structured `{ error: "OUT_OF_STOCK", alternative_part: "PSU-770-REV2" }` object, and the agent explains the fallback cleanly without crashing.
5. **Stage 5 — FOLLOW-UP (Automated Service Report & Escalation):**
   - Technician says: *"Wrap up my visit log and generate the field service report for the supervisor."*
   - **Agent Action:** Calls `generate_service_report(ticket_id="TKT-409", technician_name="Ragul", summary=...)` → creates a structured, timestamped Field Service Report with root cause, parts reserved, safety compliance status, and next visit ETA, and dispatches a mock supervisor webhook/notification.
   - **UI Effect:** Renders a downloadable/printable **Field Service Report Modal/Drawer** on the dashboard with a 1-click **Export JSON / Print Report** button.

---

## 5. Backend Architecture & File Specifications

### 5.1 Enterprise Mock Database & State Store (`lib/field-store.ts`)
Create a clean, deterministic server-side state store (`lib/field-store.ts`) backed by a module-level singleton + optional `/tmp/fieldtech-state.json` persistence so state survives hot reloads during development and provides a `resetDemoState()` endpoint for clean judging resets.

**Seed Data (`lib/field-store.ts`):**
- **Tickets (`tickets`):**
  - `TKT-409`: Title: `"5G BBU-9000X Thermal Fault & Backhaul Flap"`, Site: `"Substation Bay 4 - Whitefield Sector 2"`, Priority: `"CRITICAL"`, Status: `"ASSIGNED"`, AssignedTo: `"Ragul P."`, EquipmentId: `"EQ-BBU-04"`, History: `["2026-08-14: Routine filter clean", "2026-10-02: Minor high-temp warning (74C)"]`.
  - `TKT-412`: Title: `"Optical Line Terminal Power Redundancy Check"`, Site: `"POP Node 11 - Indiranagar"`, Priority: `"MEDIUM"`, Status: `"SCHEDULED"`, AssignedTo: `"Ragul P."`, EquipmentId: `"EQ-OLT-11"`.
- **Knowledge Base / RAG Documents (`manuals`):**
  - `BBU-9000X` / `E-412`: Symptom: `"Fan rotor speed < 1200 RPM + chassis temp > 78C"`. Root Cause: `"Bearing seizure on primary blower FAN-90X-PRO"`. Safety Warning: `"Engage DC breaker CB-04 and wait 60 seconds for capacitor discharge before opening chassis"`. Steps: `["1. Verify DC isolation at CB-04", "2. Unlatch front intake shroud", "3. Replace FAN-90X-PRO and torque M4 screws to 1.8 Nm", "4. Run self-test diagnostics via craft port"]`.
  - `OLT-5000` / `E-108`: Battery bank float voltage drift procedure.
- **Spare Parts Inventory (`inventory`):**
  - `FAN-90X-PRO`: Name: `"BBU-9000X High-Static Cooling Fan Assembly"`, VanStock: `0`, Warehouse: `"BLR-EAST-HUB"`, Bin: `"B-14"`, AvailableQty: `4`, UnitCost: `"$145.00"`.
  - `THM-PASTE-IND`: Name: `"Industrial Ceramic Thermal Compound"`, VanStock: `3`, Warehouse: `"VAN-12"`, Bin: `"DRAWER-2"`, AvailableQty: `3`, UnitCost: `"$18.00"`.
  - `PSU-770`: Name: `"48V DC Rectifier Module (Legacy)"`, VanStock: `0`, Warehouse: `"BLR-EAST-HUB"`, Bin: `"A-02"`, AvailableQty: `0`, AlternativePart: `"PSU-770-REV2"`.
- **Audit Log / Action Timeline (`actionLogs`):** Array of `{ id, timestamp, toolName, status, summary, details }` updated every time a tool runs.
- **Service Reports (`serviceReports`):** Array of generated reports linked to tickets.

### 5.2 Agent Tools Definition & Executor (`lib/agent-tools.ts`)
Define OpenAI-compatible JSON Schema `tools` and a strongly-typed `executeToolCall(name, args)` dispatcher:

1. `get_assigned_ticket({ ticket_id?: string })`
   - Returns ticket details, equipment specs, and maintenance history. Defaults to `TKT-409` if technician says "my current ticket" or "Bay 4".
2. `search_maintenance_manual({ equipment_model: string, error_code?: string, symptom?: string })`
   - Performs keyword + semantic scoring over `manuals`, returning safety precautions, root cause, required part numbers, and numbered repair steps.
3. `check_part_inventory({ part_number: string })`
   - Checks `VAN-12` and `BLR-EAST-HUB` stock levels. If `AvailableQty === 0`, returns `status: "OUT_OF_STOCK"` along with `alternative_part` if available.
4. `reserve_spare_part({ ticket_id: string, part_number: string, warehouse: string, confirmed: boolean })`
   - **Guardrail:** If `confirmed !== true`, return `{ status: "CONFIRMATION_REQUIRED", message: "Ask the technician for explicit verbal confirmation before reserving inventory." }`.
   - When `confirmed === true`, decrements `AvailableQty`, generates reservation ID `RSV-XXXX`, logs to `actionLogs`, and returns confirmation.
5. `update_work_order({ ticket_id: string, status: string, notes: string, confirmed: boolean })`
   - **Guardrail:** Requires `confirmed === true`. Updates ticket status and appends field notes to ticket history + `actionLogs`.
6. `generate_service_report({ ticket_id: string, root_cause: string, actions_taken: string, parts_used_or_reserved: string, follow_up_required: string })`
   - Compiles a formal structured Service Report, saves it to `serviceReports`, marks supervisor notification as sent (`SUPERVISOR_NOTIFIED`), logs to `actionLogs`, and returns the report summary.

### 5.3 Agora Invite Route with Murf AI Falcon TTS (`app/api/invite-agent/route.ts`)
Modify `app/api/invite-agent/route.ts` to configure Agora's Conversational AI `/join` payload with:
1. **TTS (`tts` block):** Configure **Murf AI Falcon TTS**:
   ```ts
   tts: {
     vendor: "murf",
     params: {
       api_key: process.env.MURF_API_KEY,
       base_url: "wss://global.api.murf.ai/v1/speech/stream-input",
       voiceId: process.env.MURF_VOICE_ID || "en-US-ken",
       model: process.env.MURF_MODEL || "falcon-2.1",
       locale: process.env.MURF_LOCALE || "en-US",
       sample_rate: 24000,
     },
   }
   ```
   *(Note: Verify against Agora's latest Murf schema in `docs.agora.io/en/ai/models/tts/murf` if any field name differs during testing.)*
2. **LLM (`llm` block):** Point Agora's Conversational AI Engine to our Custom LLM endpoint:
   ```ts
   llm: {
     url: `${process.env.APP_PUBLIC_URL}/api/chat/completions`,
     api_key: process.env.CUSTOM_LLM_AUTH_TOKEN || "fieldtech-secret-token",
     system_messages: [
       {
         role: "system",
         content: FIELD_TECH_SYSTEM_PROMPT,
       },
     ],
     greeting_message:
       "FieldTech Copilot online. You are assigned to Ticket T K T 409 at Substation Bay 4. How can I help you on site?",
     failure_message:
       "I hit a brief connection snag reaching the enterprise system. Could you repeat that?",
     max_history: 20,
     params: {
       model: process.env.LLM_MODEL || "gpt-4o-mini",
     },
   }
   ```
3. **Turn Detection / Noise Suppression:** Keep Agora's built-in VAD/turn detection enabled so hands-free barge-in works cleanly during the demo.

### 5.4 Custom LLM SSE Endpoint with Agentic Tool Loop (`app/api/chat/completions/route.ts` & `lib/chat-completions.ts`)
Implement an OpenAI Chat Completions SSE streaming route that Agora Cloud calls on every user turn:
1. Validate incoming `Authorization: Bearer <CUSTOM_LLM_AUTH_TOKEN>` header (log warning if missing in dev, enforce if configured).
2. Extract `messages` sent by Agora Cloud. Prepend `FIELD_TECH_SYSTEM_PROMPT` if not already present.
3. **Agentic Execution Loop (Max 4 iterations):**
   - Call upstream `LLM_API_URL` (`stream: false` for intermediate tool-call turns, or stream final turn) with `tools` array from `lib/agent-tools.ts`.
   - If the LLM responds with `tool_calls`:
     - Execute each requested tool via `executeToolCall(...)` in `lib/agent-tools.ts`.
     - Append the assistant `tool_calls` message and `role: "tool"` result messages to the conversation array.
     - Re-invoke the LLM so it formulates a concise, natural spoken response grounded in the tool output.
   - Once the LLM produces a final assistant text message (no further `tool_calls`):
     - Stream it back to Agora Cloud in strict **OpenAI SSE format** (`data: {"id":"...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"..."}}]}\n\n` ending with `data: [DONE]\n\n`) so Murf AI Falcon TTS begins speaking immediately with minimal TTFT (Time-To-First-Token).

### 5.5 Live State & Demo Reset API (`app/api/field-state/route.ts`)
- `GET /api/field-state`: Returns `{ tickets, inventory, actionLogs, serviceReports, activeManual }` as JSON.
- `POST /api/field-state`: Supports `{ action: "reset" }` to restore initial demo state cleanly between practice runs and final judging.

---

## 6. Frontend UI / UX Architecture (`components/`)
Upgrade the existing Quickstart UI into a **split-screen Industrial Field Operations Console** while preserving `AgentVisualizer`, `QuickstartPipelineMetrics`, and `QuickstartTranscriptPanel`:

1. **Top Command Bar:**
   - App Branding: **FieldTech Copilot** (`Powered by Agora ConvoAI + Murf AI Falcon TTS`).
   - Live Pipeline Latency Chips (existing `QuickstartPipelineMetrics` showing STT / LLM / Murf TTS latency).
   - **"Reset Demo Data"** button (calls `POST /api/field-state`) + **"View Service Report"** badge counter.
2. **Left Column (40% width) — Voice & Live Transcript Rail:**
   - Existing `AgentVisualizer` + Mic Mute / End Shift controls.
   - Live `QuickstartTranscriptPanel` showing technician & copilot dialogue.
   - **Quick Demo Prompt Chips (Optional Click-to-Copy / Reference):** Small collapsible helper card listing the 4 demo voice commands so the presenter never forgets exact ticket/part codes under stage pressure.
3. **Right Column (60% width) — Live Enterprise Operations Workspace (Polls `/api/field-state` every 1.5s while call is active):**
   - **Active Work Order Card (`TKT-409`):** Status badge (`ASSIGNED` → `IN_PROGRESS_PART_RESERVED` → `COMPLETED`), Site location, Equipment ID (`BBU-9000X`), and chronological history notes.
   - **Diagnostic & Safety Runbook Panel:** Highlights active manual steps and red safety lockout callout whenever `search_maintenance_manual` is triggered.
   - **Spare Parts & Warehouse Stock Table:** Shows `FAN-90X-PRO`, `THM-PASTE-IND`, `PSU-770` with live stock counts and reservation tag (`RSV-XXXX`) flashing green when reserved.
   - **Agentic Action Audit Feed:** Real-time timeline showing every tool call executed (`get_assigned_ticket`, `search_maintenance_manual`, `reserve_spare_part`, `generate_service_report`) with timestamps and latency—proving to judges that real agentic actions occurred.
   - **Service Report Drawer / Modal:** Displays the formatted Field Service Report when generated, with a **Print / Download Report** button.

---

## 7. Incremental Implementation Plan (Follow in Order)
Execute these milestones sequentially and verify each step before moving to the next:

- **Milestone 1 (Data & Tools Foundation):**
  - Create `lib/field-store.ts` and `lib/agent-tools.ts`.
  - Create `app/api/field-state/route.ts`.
  - Verify TypeScript compilation (`pnpm run typecheck`).
- **Milestone 2 (Custom LLM SSE + Murf Falcon Integration):**
  - Update `lib/chat-completions.ts` and `app/api/chat/completions/route.ts` with the OpenAI-compatible tool-calling loop and SSE streamer.
  - Update `app/api/invite-agent/route.ts` to configure `vendor: "murf"` (Falcon TTS) and `llm.url` pointing to `${APP_PUBLIC_URL}/api/chat/completions`.
  - Test `/api/chat/completions` locally using `curl` with a sample user message (`"Check ticket TKT-409"`) to verify tool execution and valid SSE chunks.
- **Milestone 3 (Field Operations Dashboard UI):**
  - Build `components/FieldOperationsConsole.tsx` (Work Order card, Runbook card, Inventory table, Agent Action Audit timeline, Service Report modal) and integrate it cleanly into `components/QuickstartConversationLayout.tsx` without breaking RTC/RTM hooks.
- **Milestone 4 (End-to-End Voice Verification):**
  - Start `ngrok http 3000`, set `APP_PUBLIC_URL`, run `pnpm run verify`, start `pnpm dev`, and run through the 5-stage voice demo from start to finish.