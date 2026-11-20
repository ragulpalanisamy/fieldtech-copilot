# FieldTech Copilot — Day-of-Build Master Plan
> **Deadline:** Nov 21, 2026 · 12:30 PM IST  
> **For:** Antigravity / Gemini Flash (AI coding agent executing tomorrow's build)  
> **Strategy:** Clone Agora quickstart → add 4 milestones → verify → demo

---

## PHASE 0 — Repository Bootstrap (Do First, ~10 min)

### Status Check
Your workspace is `d:\Personal\fieldtech-copilot`. It currently contains only:
- `REQUIREMENTS.md`, `README.md`, `.claude/skills.md`, `.github/CODEOWNER`, `LICENSE`

**The Agora Next.js quickstart code is NOT yet present.** You must merge it in.

### Commands to Run (PowerShell, in order)

```powershell
# Step 1: Add Agora upstream and fetch
cd d:\Personal\fieldtech-copilot
git remote add upstream https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs.git
git fetch upstream main

# Step 2: Merge Agora starter into this repo (allow unrelated histories)
git merge upstream/main --allow-unrelated-histories --no-edit

# Step 3: Install dependencies
pnpm install

# Step 4: Verify the base starter compiles clean
pnpm run typecheck
```

> ⚠️ If `pnpm run typecheck` passes → proceed. If it fails → read the error; likely a missing type package. Fix before adding any new code.

### After merge, copy your keys to `.env.local`
Create `d:\Personal\fieldtech-copilot\.env.local` with the following (fill in real values):

```env
# Existing Agora Variables (from env.local.example in the cloned repo)
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id_here
NEXT_AGORA_APP_CERTIFICATE=your_agora_app_certificate_here
NEXT_AGORA_CUSTOMER_ID=your_agora_customer_id_here
NEXT_AGORA_CUSTOMER_SECRET=your_agora_customer_secret_here

# Public URL reachable by Agora Cloud (run: ngrok http 3000 → copy HTTPS URL)
APP_PUBLIC_URL=https://your-tunnel.ngrok-free.app

# Murf AI Falcon TTS
MURF_API_KEY=your_murf_api_key_here
MURF_VOICE_ID=en-US-ken
MURF_MODEL=FALCON
MURF_LOCALE=en-US

# Custom LLM (OpenAI-compatible)
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=your_openai_api_key_here
LLM_MODEL=gpt-4o-mini

# Auth token Agora Cloud will send in Authorization header to our SSE endpoint
CUSTOM_LLM_AUTH_TOKEN=fieldtech-secret-token
```

> `.env.local` is in `.gitignore` by default — secrets will NOT be pushed to GitHub. ✓

---

## MILESTONE 1 — Data & Tools Foundation
**Target files to CREATE:**
1. `lib/field-store.ts`
2. `lib/agent-tools.ts`
3. `app/api/field-state/route.ts`

**Verify:** `pnpm run typecheck` — must pass with 0 errors before proceeding.

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) → Section M1 for complete, ready-to-paste TypeScript code.
> Path from repo root: `docs/IMPLEMENTATION.md`

---

## MILESTONE 2 — Custom LLM SSE + Murf Falcon Integration
**Target files to MODIFY/CREATE:**
1. `lib/chat-completions.ts` ← **modify** (add tool-calling agentic loop)
2. `app/api/chat/completions/route.ts` ← **create new** (SSE streaming route)
3. `app/api/invite-agent/route.ts` ← **modify** (add Murf Falcon + custom LLM URL)

**Verify SSE endpoint locally:**
```bash
curl -X POST http://localhost:3000/api/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fieldtech-secret-token" \
  -d '{"messages":[{"role":"user","content":"Check ticket TKT-409"}],"stream":true}' \
  --no-buffer
```
Expected: stream of `data: {...}` lines ending with `data: [DONE]`

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) → Section M2 for complete code.

---

## MILESTONE 3 — Field Operations Console UI
**Target files to CREATE/MODIFY:**
1. `components/FieldOperationsConsole.tsx` ← **create new**
2. `components/QuickstartConversationLayout.tsx` ← **modify** (add right panel)

**Verify:** `pnpm dev` → open http://localhost:3000 → check UI renders with both panels.

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) → Section M3 for complete code.

---

## MILESTONE 4 — End-to-End Voice Demo Verification
```powershell
# Terminal 1: Start ngrok tunnel
ngrok http 3000

# Update APP_PUBLIC_URL in .env.local with the HTTPS ngrok URL shown

# Terminal 2: Start dev server  
pnpm dev

# Then run through the 5-stage voice demo script in DEMO_SCRIPT.md
```

---

## Git Commit Strategy (For Clean Judge-Ready History)

```bash
git add lib/field-store.ts lib/agent-tools.ts app/api/field-state/
git commit -m "feat(M1): add field data store, agent tools, field-state API"

git add lib/field-tech-prompt.ts lib/chat-completions.ts app/api/chat/ app/api/invite-agent/
git commit -m "feat(M2): custom LLM SSE tool-calling loop + Murf Falcon TTS invite"

git add components/FieldOperationsConsole.tsx components/QuickstartConversationLayout.tsx
git commit -m "feat(M3): field operations console UI with live state polling"

git push origin main
```

---

## Submission Checklist (by 12:30 PM)
- [ ] GitHub repo public: https://github.com/ragulpalanisamy/fieldtech-copilot
- [ ] Live demo URL (ngrok or Vercel) working
- [ ] Voice demo runs all 5 stages cleanly
- [ ] README.md updated with setup instructions
- [ ] Demo video recorded (optional but recommended)
