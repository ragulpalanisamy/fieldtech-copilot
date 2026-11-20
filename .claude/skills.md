---
name: fieldtech-karpathy
description: Karpathy coding discipline + Agora/Murf hackathon guardrails for FieldTech Copilot. Keeps changes minimal, surgical, and verifiable before the 12:30 PM deadline.
---

# FieldTech Copilot — Engineering Rules

## 1. Think Before Coding
- Read existing Agora token, invite, stop, and transcript/visualizer files before editing.
- Flag any ambiguity in Agora Murf TTS payload fields or public tunnel URLs before guessing.
- Prefer the smallest working implementation for the 5-stage demo flow.

## 2. Simplicity First
- Build clean, self-contained TypeScript modules with clear types and no over-abstraction.
- Keep spoken LLM responses short (1–3 sentences, plain speech—no markdown tables/bullets/code blocks) and put structured data in the UI console.
- Require explicit confirmation (`confirmed: true`) for mutating actions (reserving parts, updating ticket status).

## 3. Surgical Changes
- Do NOT break `buildTokenWithRtm`, shared agent UID handling, `uid === "0"` speaker mapping, or `/api/stop-conversation` teardown.
- Do NOT reformat or refactor unrelated quickstart code. Clean up only unused imports/code you introduce.

## 4. Goal-Driven Execution
- Work in small increments with explicit verification checks:
  1. Data store + tools + `/api/field-state` → verify: `pnpm run typecheck`
  2. Custom LLM SSE + `/api/invite-agent` (Murf Falcon) → verify: `curl` SSE test + agent join
  3. Field Operations Console UI → verify: `pnpm run verify` + live voice run