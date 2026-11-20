# DEMO_SCRIPT.md — FieldTech Copilot Live Demo (5-Stage, ~90 seconds)
> Say these voice commands exactly during the demo.  
> Watch the right panel update in real time after each command.

---

## Pre-Demo Setup Checklist
- [ ] ngrok running → `APP_PUBLIC_URL` in `.env.local` updated
- [ ] `pnpm dev` running in separate terminal
- [ ] Browser open at `http://localhost:3000`
- [ ] Demo Reset done: click **Reset Demo** button in the console OR call `POST /api/field-state` with `{ action: "reset" }`
- [ ] API keys confirmed in `.env.local`: `NEXT_PUBLIC_AGORA_APP_ID`, `MURF_API_KEY`, `LLM_API_KEY`

---

## Stage 1 — INITIATE & BEFORE (Context Retrieval)

**Action:** Click the **Start / Connect Copilot** button on the UI.

**Wait for:** Murf Falcon TTS greeting voice: *"FieldTech Copilot online. You are assigned to Ticket T K T 4 0 9 at Substation Bay 4. How can I assist you on site today?"*

**Say:**
> *"Hey Copilot, I'm on site at Substation Bay 4. Pull up my assigned ticket and check the unit's history."*

**Expected AI response (spoken):** Something like — *"I've retrieved Ticket T K T 4 0 9 for the 5G baseband unit at Substation Bay 4. It's marked critical with a thermal fault. I've also loaded the equipment history on your screen."*

**Expected UI change:** Work Order card shows TKT-409 with ASSIGNED status, equipment history, and safety lockout notices.

**Tool called:** `get_assigned_ticket({ ticket_id: "TKT-409" })`

---

## Stage 2 — DURING (Diagnostic Troubleshooting)

**Say:**
> *"The unit is showing error E-412 and the intake fan is rattling. What's the diagnostic procedure?"*

**Expected AI response (spoken):** Something like — *"Error 4 1 2 indicates a fan bearing seizure causing overheating. I've loaded the safety procedures and repair steps on your screen. Please note: you must engage breaker C B zero four before opening the chassis."*

**Expected UI change:** Diagnostic Runbook card appears with 10 repair steps, red safety lockout warning, and required parts list (FAN-90X-PRO, THM-PASTE-IND).

**Tool called:** `search_maintenance_manual({ equipment_model: "BBU-9000X", error_code: "E-412" })`

---

## Stage 3 — ACTION & CONFIRM (Inventory + Human-in-the-Loop)

**Say:**
> *"Check if we have the replacement fan assembly in stock and reserve it."*

**Expected AI response (spoken):** Something like — *"I found 4 units of the Fan 90 X Pro at Bengaluru East Hub, Bin B 14, about 15 minutes away. Zero in the van. Should I reserve one for Ticket T K T 4 0 9?"*

**Expected UI change:** Inventory table shows FAN-90X-PRO: Van=0, Warehouse=4.

**Tools called:** `check_part_inventory({ part_number: "FAN-90X-PRO" })` → then asks for confirmation

**Say:** *(after the confirmation question)*
> *"Yes, go ahead and reserve it."*

**Expected AI response (spoken):** *"Done. I've reserved one Fan 90 X Pro from Bengaluru East Hub. The reservation is confirmed and you can find the reservation ID on your screen."*

**Expected UI change:** Reservation badge (RSV-XXXX) appears, warehouse qty drops from 4→3, status shows RESERVED.

**Tools called:** `reserve_spare_part({ ticket_id: "TKT-409", part_number: "FAN-90X-PRO", warehouse: "BLR-EAST-HUB", confirmed: true })` + `update_work_order({ ticket_id: "TKT-409", status: "IN_PROGRESS_PART_RESERVED", confirmed: true })`

---

## Stage 4 — ERROR HANDLING (Graceful Recovery)

> *Optional demo — do this if time allows (~10 seconds)*

**Say:**
> *"Can you check if PSU-770 is available?"*

**Expected AI response (spoken):** *"The P S U 770 is out of stock at all locations. However, I see an alternative part P S U 770 Rev 2 may be available. Want me to check that instead?"*

**Tool called:** `check_part_inventory({ part_number: "PSU-770" })` → returns OUT_OF_STOCK with alternative

---

## Stage 5 — FOLLOW-UP (Service Report & Escalation)

**Say:**
> *"Wrap up my visit log and generate the field service report for my supervisor."*

**Expected AI response (spoken):** *"Field service report generated for Ticket T K T 4 0 9. Root cause was the fan bearing seizure. The fan replacement has been reserved and your supervisor has been notified. Report is now on your screen."*

**Expected UI change:**
- Service Report badge appears in top bar (green)
- Clicking it opens the full Service Report modal with all details
- Download JSON button is available

**Tool called:** `generate_service_report({ ticket_id: "TKT-409", technician_name: "Ragul", ... })`

---

## Talking Points for Judges

1. **Real-time agentic AI** — Not a chatbot. The LLM uses tool calling to query live systems.
2. **Murf AI Falcon TTS** — Natural, low-latency voice output via Agora ConvoAI pipeline.
3. **Human-in-the-loop** — System asks for explicit confirmation before any write operations.
4. **Multi-step workflow** — Single "reserve it" command triggers 2 chained tool calls.
5. **Live visual console** — Judges can SEE the agentic actions in real time (action log).
6. **Error resilience** — Graceful fallback for out-of-stock parts with alternatives.
7. **End-to-end service lifecycle** — Before → During → Action → Confirm → Follow-up.
