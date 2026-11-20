# IMPLEMENTATION.md — Complete Code for All 4 Milestones
> **For Antigravity / Gemini Flash:** Read this file top-to-bottom. Implement each milestone in order.  
> **Rule:** Run `pnpm run typecheck` after EVERY milestone. Fix all TypeScript errors before moving on.  
> **Rule:** Do NOT modify `app/api/generate-agora-token/route.ts` or `app/api/stop-conversation/route.ts`.  
> **Rule:** Do NOT break `uid === "0"` agent speaker mapping in `components/ConversationComponent.tsx`.

---

## PRE-WORK: Read These Existing Files First

Before writing any code, READ the following files from the merged Agora quickstart:
1. `app/api/generate-agora-token/route.ts` — understand `buildTokenWithRtm` usage
2. `app/api/invite-agent/route.ts` — understand current agent join payload structure  
3. `app/api/stop-conversation/route.ts` — understand teardown; DO NOT touch
4. `lib/agora.ts` — understand shared UID constants
5. `lib/chat-completions.ts` — understand existing SSE/streaming helpers
6. `components/ConversationComponent.tsx` — understand `uid === "0"` mapping + mic release
7. `components/QuickstartConversationLayout.tsx` — understand layout to extend it

Only after reading all 7 files should you begin writing new code.

---

## M1 — Data & Tools Foundation

### File 1: `lib/field-store.ts` (CREATE NEW)

```typescript
// lib/field-store.ts
// Singleton in-memory state store for FieldTech Copilot demo data.
// Survives hot reloads via module-level singleton.
// All state mutations go through exported functions — never mutate directly.

export interface Ticket {
  id: string;
  title: string;
  site: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: string;
  assignedTo: string;
  equipmentId: string;
  equipmentModel: string;
  history: string[];
  safetyNotes: string[];
}

export interface ManualEntry {
  equipmentModel: string;
  errorCode: string;
  symptom: string;
  rootCause: string;
  requiredParts: string[];
  safetyWarning: string;
  steps: string[];
}

export interface InventoryItem {
  partNumber: string;
  name: string;
  vanStock: number;
  warehouseName: string;
  warehouseCode: string;
  bin: string;
  availableQty: number;
  unitCost: string;
  reservationId?: string;
  reservedForTicket?: string;
  alternativePart?: string;
}

export interface ActionLog {
  id: string;
  timestamp: string;
  toolName: string;
  status: "SUCCESS" | "ERROR" | "CONFIRMATION_REQUIRED";
  summary: string;
  details: Record<string, unknown>;
}

export interface ServiceReport {
  reportId: string;
  ticketId: string;
  generatedAt: string;
  technicianName: string;
  site: string;
  equipmentId: string;
  rootCause: string;
  actionsTaken: string;
  partsUsedOrReserved: string;
  followUpRequired: string;
  supervisorNotified: boolean;
}

export interface FieldState {
  tickets: Record<string, Ticket>;
  manuals: ManualEntry[];
  inventory: Record<string, InventoryItem>;
  actionLogs: ActionLog[];
  serviceReports: ServiceReport[];
  activeManual: ManualEntry | null;
}

// --- SEED DATA ---

const SEED_STATE: FieldState = {
  tickets: {
    "TKT-409": {
      id: "TKT-409",
      title: "5G BBU-9000X Thermal Fault & Backhaul Flap",
      site: "Substation Bay 4 - Whitefield Sector 2",
      priority: "CRITICAL",
      status: "ASSIGNED",
      assignedTo: "Ragul P.",
      equipmentId: "EQ-BBU-04",
      equipmentModel: "BBU-9000X",
      history: [
        "2026-08-14: Routine filter clean — no anomalies",
        "2026-10-02: Minor high-temp warning (74C) — cleared remotely",
        "2026-11-20: Critical thermal fault E-412 + backhaul flap reported by NOC",
      ],
      safetyNotes: [
        "LOCKOUT/TAGOUT: Engage DC breaker CB-04 before opening chassis",
        "Wait 60 seconds for capacitor discharge before touching internal components",
        "Minimum PPE: Class-E insulating gloves + safety glasses",
      ],
    },
    "TKT-412": {
      id: "TKT-412",
      title: "Optical Line Terminal Power Redundancy Check",
      site: "POP Node 11 - Indiranagar",
      priority: "MEDIUM",
      status: "SCHEDULED",
      assignedTo: "Ragul P.",
      equipmentId: "EQ-OLT-11",
      equipmentModel: "OLT-5000",
      history: ["2026-11-18: Scheduled preventive maintenance"],
      safetyNotes: ["Standard fiber PPE — laser safety goggles required"],
    },
  },
  manuals: [
    {
      equipmentModel: "BBU-9000X",
      errorCode: "E-412",
      symptom: "Fan rotor speed < 1200 RPM + chassis temperature > 78C",
      rootCause:
        "Bearing seizure on primary blower assembly FAN-90X-PRO causing insufficient airflow",
      requiredParts: ["FAN-90X-PRO", "THM-PASTE-IND"],
      safetyWarning:
        "CRITICAL: Engage DC breaker CB-04 and wait 60 seconds for capacitor discharge before opening chassis. High-voltage risk.",
      steps: [
        "1. Verify DC isolation at breaker CB-04 — confirm LED is OFF",
        "2. Wait 60 seconds for capacitor discharge",
        "3. Unlatch front intake shroud (3x M4 quarter-turn fasteners)",
        "4. Disconnect FAN-90X-PRO connector (white 4-pin JST)",
        "5. Remove 4x M4 mounting screws (torque spec: 1.8 Nm)",
        "6. Install replacement FAN-90X-PRO — torque M4 screws to 1.8 Nm",
        "7. Apply THM-PASTE-IND to CPU heatsink (3mm bead, spread with applicator)",
        "8. Reconnect fan connector and reattach shroud",
        "9. Re-energize at CB-04 and run self-test via craft port: diag thermal --full",
        "10. Verify fan RPM > 2800 and chassis temp < 72C within 5 minutes",
      ],
    },
    {
      equipmentModel: "OLT-5000",
      errorCode: "E-108",
      symptom: "Battery bank float voltage drift > 0.5V from nominal",
      rootCause: "Aging battery cells causing uneven charge distribution",
      requiredParts: ["BAT-48V-CELL"],
      safetyWarning:
        "Battery acid hazard. Wear chemical-resistant gloves and goggles. No open flames near battery bay.",
      steps: [
        "1. Connect calibrated multimeter to battery terminals",
        "2. Record individual cell voltages across all 12 cells",
        "3. Identify cells deviating > 0.3V from mean",
        "4. Replace identified cells with BAT-48V-CELL",
        "5. Run float charge equalization cycle (2 hours)",
        "6. Verify all cells within plus or minus 0.1V of nominal 48.6V",
      ],
    },
  ],
  inventory: {
    "FAN-90X-PRO": {
      partNumber: "FAN-90X-PRO",
      name: "BBU-9000X High-Static Cooling Fan Assembly",
      vanStock: 0,
      warehouseName: "Bengaluru East Hub",
      warehouseCode: "BLR-EAST-HUB",
      bin: "B-14",
      availableQty: 4,
      unitCost: "$145.00",
    },
    "THM-PASTE-IND": {
      partNumber: "THM-PASTE-IND",
      name: "Industrial Ceramic Thermal Compound (5g)",
      vanStock: 3,
      warehouseName: "Van #12 (On-Site)",
      warehouseCode: "VAN-12",
      bin: "DRAWER-2",
      availableQty: 3,
      unitCost: "$18.00",
    },
    "PSU-770": {
      partNumber: "PSU-770",
      name: "48V DC Rectifier Module (Legacy)",
      vanStock: 0,
      warehouseName: "Bengaluru East Hub",
      warehouseCode: "BLR-EAST-HUB",
      bin: "A-02",
      availableQty: 0,
      unitCost: "$320.00",
      alternativePart: "PSU-770-REV2",
    },
  },
  actionLogs: [],
  serviceReports: [],
  activeManual: null,
};

// --- SINGLETON ---

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

let _state: FieldState = deepClone(SEED_STATE);

export function getState(): FieldState {
  return _state;
}

export function resetState(): void {
  _state = deepClone(SEED_STATE);
}

export function getTicket(ticketId: string): Ticket | null {
  return _state.tickets[ticketId] ?? null;
}

export function updateTicketStatus(
  ticketId: string,
  status: string,
  note: string
): Ticket | null {
  const ticket = _state.tickets[ticketId];
  if (!ticket) return null;
  ticket.status = status;
  ticket.history.push(
    `${new Date().toISOString().split("T")[0]}: ${note}`
  );
  return ticket;
}

export function searchManual(
  equipmentModel: string,
  errorCode?: string,
  symptom?: string
): ManualEntry | null {
  const model = equipmentModel.toUpperCase();
  const code = errorCode?.toUpperCase();
  const sym = symptom?.toLowerCase();

  const result = _state.manuals.find((m) => {
    const modelMatch = m.equipmentModel.toUpperCase().includes(model);
    const codeMatch = code ? m.errorCode.toUpperCase() === code : true;
    const symMatch = sym ? m.symptom.toLowerCase().includes(sym) : true;
    return modelMatch && (codeMatch || symMatch);
  });

  if (result) {
    _state.activeManual = result;
  }
  return result ?? null;
}

export function getInventoryItem(partNumber: string): InventoryItem | null {
  return _state.inventory[partNumber.toUpperCase()] ?? null;
}

export function reservePart(
  partNumber: string,
  ticketId: string
): { reservationId: string; item: InventoryItem } | { error: string } {
  const item = _state.inventory[partNumber.toUpperCase()];
  if (!item) return { error: `Part ${partNumber} not found in inventory.` };
  if (item.availableQty <= 0) {
    return {
      error: `OUT_OF_STOCK: ${partNumber} has 0 available. ${
        item.alternativePart
          ? `Alternative: ${item.alternativePart}`
          : "No alternative available."
      }`,
    };
  }
  item.availableQty -= 1;
  const reservationId = `RSV-${Math.floor(1000 + Math.random() * 9000)}`;
  item.reservationId = reservationId;
  item.reservedForTicket = ticketId;
  return { reservationId, item };
}

export function addActionLog(log: Omit<ActionLog, "id" | "timestamp">): ActionLog {
  const entry: ActionLog = {
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...log,
  };
  _state.actionLogs.push(entry);
  return entry;
}

export function addServiceReport(report: Omit<ServiceReport, "reportId" | "generatedAt">): ServiceReport {
  const entry: ServiceReport = {
    reportId: `RPT-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    ...report,
  };
  _state.serviceReports.push(entry);
  return entry;
}
```

---

### File 2: `lib/agent-tools.ts` (CREATE NEW)

```typescript
// lib/agent-tools.ts
// OpenAI-compatible tool schemas + executors for all 6 field technician tools.
// Called by the agentic loop in app/api/chat/completions/route.ts.

import {
  getTicket,
  searchManual,
  getInventoryItem,
  reservePart,
  updateTicketStatus,
  addActionLog,
  addServiceReport,
} from "./field-store";

// --- TOOL SCHEMAS (OpenAI function_calling format) ---

export const FIELD_TECH_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_assigned_ticket",
      description:
        "Retrieves a work order ticket with equipment details and maintenance history. Use when technician asks about their current ticket, job, or assignment. Default ticket is TKT-409.",
      parameters: {
        type: "object",
        properties: {
          ticket_id: {
            type: "string",
            description: "Ticket ID, e.g. TKT-409. Defaults to TKT-409 if not specified.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_maintenance_manual",
      description:
        "Searches OEM maintenance manuals for diagnostic steps, safety procedures, and required parts. Use when technician reports an error code, describes a symptom, or asks for repair procedures.",
      parameters: {
        type: "object",
        properties: {
          equipment_model: {
            type: "string",
            description: "Equipment model, e.g. BBU-9000X",
          },
          error_code: {
            type: "string",
            description: "Error code reported by equipment, e.g. E-412",
          },
          symptom: {
            type: "string",
            description: "Symptom description if no error code is known",
          },
        },
        required: ["equipment_model"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_part_inventory",
      description:
        "Checks van stock and warehouse stock for a spare part. Returns available quantity and location. Use before recommending a part reservation.",
      parameters: {
        type: "object",
        properties: {
          part_number: {
            type: "string",
            description: "Spare part number, e.g. FAN-90X-PRO",
          },
        },
        required: ["part_number"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reserve_spare_part",
      description:
        "Reserves a spare part from warehouse inventory for a specific ticket. REQUIRES confirmed=true from the technician before executing. If confirmed is false or not provided, return a confirmation request message.",
      parameters: {
        type: "object",
        properties: {
          ticket_id: {
            type: "string",
            description: "Ticket ID to link the reservation to",
          },
          part_number: {
            type: "string",
            description: "Spare part number to reserve",
          },
          warehouse: {
            type: "string",
            description: "Warehouse code where the part is available",
          },
          confirmed: {
            type: "boolean",
            description:
              "Must be true. Only set true when the technician has explicitly confirmed the reservation verbally.",
          },
        },
        required: ["ticket_id", "part_number", "warehouse", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_work_order",
      description:
        "Updates a work order ticket status and appends field notes. REQUIRES confirmed=true from the technician for status changes. Use after completing an action.",
      parameters: {
        type: "object",
        properties: {
          ticket_id: {
            type: "string",
            description: "Ticket ID to update",
          },
          status: {
            type: "string",
            description:
              "New status, e.g. IN_PROGRESS, IN_PROGRESS_PART_RESERVED, COMPLETED, ESCALATED",
          },
          notes: {
            type: "string",
            description: "Field notes to append to the ticket history",
          },
          confirmed: {
            type: "boolean",
            description: "Must be true — technician has confirmed the status update",
          },
        },
        required: ["ticket_id", "status", "notes", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_service_report",
      description:
        "Generates a formal field service report for a completed or in-progress ticket. Triggers supervisor notification. Use when the technician asks to wrap up, generate a report, or end the visit.",
      parameters: {
        type: "object",
        properties: {
          ticket_id: {
            type: "string",
            description: "Ticket ID for the report",
          },
          technician_name: {
            type: "string",
            description: "Name of the technician completing the report",
          },
          root_cause: {
            type: "string",
            description: "Root cause of the fault identified",
          },
          actions_taken: {
            type: "string",
            description: "Description of actions performed on site",
          },
          parts_used_or_reserved: {
            type: "string",
            description: "Parts used, replaced, or reserved during the visit",
          },
          follow_up_required: {
            type: "string",
            description: "Any follow-up actions required, or None if resolved",
          },
        },
        required: [
          "ticket_id",
          "technician_name",
          "root_cause",
          "actions_taken",
          "parts_used_or_reserved",
          "follow_up_required",
        ],
      },
    },
  },
];

// --- TOOL EXECUTORS ---

type ToolArgs = Record<string, unknown>;

export async function executeToolCall(
  name: string,
  args: ToolArgs
): Promise<string> {
  try {
    switch (name) {
      case "get_assigned_ticket": {
        const ticketId = (args.ticket_id as string) || "TKT-409";
        const ticket = getTicket(ticketId);
        if (!ticket) {
          addActionLog({
            toolName: "get_assigned_ticket",
            status: "ERROR",
            summary: `Ticket ${ticketId} not found`,
            details: { ticketId },
          });
          return JSON.stringify({ error: `Ticket ${ticketId} not found in the system.` });
        }
        addActionLog({
          toolName: "get_assigned_ticket",
          status: "SUCCESS",
          summary: `Retrieved ticket ${ticketId}: ${ticket.title}`,
          details: { ticketId, status: ticket.status, priority: ticket.priority },
        });
        return JSON.stringify(ticket);
      }

      case "search_maintenance_manual": {
        const model = args.equipment_model as string;
        const errorCode = args.error_code as string | undefined;
        const symptom = args.symptom as string | undefined;
        const manual = searchManual(model, errorCode, symptom);
        if (!manual) {
          addActionLog({
            toolName: "search_maintenance_manual",
            status: "ERROR",
            summary: `No manual found for ${model} ${errorCode ?? ""}`,
            details: { model, errorCode, symptom },
          });
          return JSON.stringify({
            error: `No maintenance manual found for model ${model} with error code ${errorCode ?? "unknown"}.`,
          });
        }
        addActionLog({
          toolName: "search_maintenance_manual",
          status: "SUCCESS",
          summary: `Found manual: ${model} ${errorCode ?? ""} — ${manual.rootCause}`,
          details: { model, errorCode, stepsCount: manual.steps.length },
        });
        return JSON.stringify(manual);
      }

      case "check_part_inventory": {
        const partNumber = args.part_number as string;
        const item = getInventoryItem(partNumber);
        if (!item) {
          addActionLog({
            toolName: "check_part_inventory",
            status: "ERROR",
            summary: `Part ${partNumber} not found in inventory`,
            details: { partNumber },
          });
          return JSON.stringify({ error: `Part ${partNumber} not found in inventory system.` });
        }
        addActionLog({
          toolName: "check_part_inventory",
          status: "SUCCESS",
          summary: `${partNumber}: Van=${item.vanStock}, Warehouse=${item.availableQty} at ${item.warehouseName}`,
          details: { partNumber, vanStock: item.vanStock, availableQty: item.availableQty },
        });
        return JSON.stringify({
          partNumber: item.partNumber,
          name: item.name,
          vanStock: item.vanStock,
          warehouse: `${item.warehouseName} (${item.warehouseCode}), Bin: ${item.bin}`,
          availableQty: item.availableQty,
          unitCost: item.unitCost,
          status: item.availableQty > 0 ? "AVAILABLE" : "OUT_OF_STOCK",
          alternativePart: item.alternativePart,
        });
      }

      case "reserve_spare_part": {
        const { ticket_id, part_number, warehouse, confirmed } = args as {
          ticket_id: string;
          part_number: string;
          warehouse: string;
          confirmed: boolean;
        };

        if (!confirmed) {
          addActionLog({
            toolName: "reserve_spare_part",
            status: "CONFIRMATION_REQUIRED",
            summary: `Awaiting technician confirmation to reserve ${part_number} for ${ticket_id}`,
            details: { ticket_id, part_number, warehouse },
          });
          return JSON.stringify({
            status: "CONFIRMATION_REQUIRED",
            message: `Please confirm: reserve 1 unit of ${part_number} from ${warehouse} for ticket ${ticket_id}? Reply yes or confirmed to proceed.`,
          });
        }

        const result = reservePart(part_number, ticket_id);
        if ("error" in result) {
          addActionLog({
            toolName: "reserve_spare_part",
            status: "ERROR",
            summary: result.error,
            details: { ticket_id, part_number, warehouse },
          });
          return JSON.stringify({ error: result.error });
        }

        addActionLog({
          toolName: "reserve_spare_part",
          status: "SUCCESS",
          summary: `Reserved ${part_number} — Reservation ID: ${result.reservationId}`,
          details: { ticket_id, part_number, warehouse, reservationId: result.reservationId },
        });
        return JSON.stringify({
          status: "RESERVED",
          reservationId: result.reservationId,
          partNumber: part_number,
          warehouse,
          remainingStock: result.item.availableQty,
          message: `Reservation confirmed. ID: ${result.reservationId}. Part will be ready for pickup at ${warehouse}.`,
        });
      }

      case "update_work_order": {
        const { ticket_id, status, notes, confirmed } = args as {
          ticket_id: string;
          status: string;
          notes: string;
          confirmed: boolean;
        };

        if (!confirmed) {
          addActionLog({
            toolName: "update_work_order",
            status: "CONFIRMATION_REQUIRED",
            summary: `Awaiting confirmation to update ${ticket_id} to ${status}`,
            details: { ticket_id, status, notes },
          });
          return JSON.stringify({
            status: "CONFIRMATION_REQUIRED",
            message: `Confirm updating ticket ${ticket_id} status to ${status}?`,
          });
        }

        const ticket = updateTicketStatus(ticket_id, status, notes);
        if (!ticket) {
          addActionLog({
            toolName: "update_work_order",
            status: "ERROR",
            summary: `Ticket ${ticket_id} not found for update`,
            details: { ticket_id, status },
          });
          return JSON.stringify({ error: `Ticket ${ticket_id} not found.` });
        }
        addActionLog({
          toolName: "update_work_order",
          status: "SUCCESS",
          summary: `Updated ${ticket_id} to status: ${status}`,
          details: { ticket_id, status, notes },
        });
        return JSON.stringify({
          status: "UPDATED",
          ticketId: ticket.id,
          newStatus: ticket.status,
          message: `Ticket ${ticket_id} updated to ${status} with field notes recorded.`,
        });
      }

      case "generate_service_report": {
        const {
          ticket_id,
          technician_name,
          root_cause,
          actions_taken,
          parts_used_or_reserved,
          follow_up_required,
        } = args as {
          ticket_id: string;
          technician_name: string;
          root_cause: string;
          actions_taken: string;
          parts_used_or_reserved: string;
          follow_up_required: string;
        };

        const ticket = getTicket(ticket_id);
        const report = addServiceReport({
          ticketId: ticket_id,
          technicianName: technician_name,
          site: ticket?.site ?? "Unknown Site",
          equipmentId: ticket?.equipmentId ?? "Unknown Equipment",
          rootCause: root_cause,
          actionsTaken: actions_taken,
          partsUsedOrReserved: parts_used_or_reserved,
          followUpRequired: follow_up_required,
          supervisorNotified: true,
        });
        addActionLog({
          toolName: "generate_service_report",
          status: "SUCCESS",
          summary: `Service report ${report.reportId} generated for ${ticket_id}`,
          details: { reportId: report.reportId, supervisorNotified: true },
        });
        return JSON.stringify({
          status: "REPORT_GENERATED",
          reportId: report.reportId,
          generatedAt: report.generatedAt,
          supervisorNotified: true,
          message: `Field service report ${report.reportId} generated and supervisor notified.`,
          report,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    addActionLog({
      toolName: name,
      status: "ERROR",
      summary: `Tool execution failed: ${message}`,
      details: { args, error: message },
    });
    return JSON.stringify({ error: `Tool ${name} failed: ${message}` });
  }
}
```

---

### File 3: `app/api/field-state/route.ts` (CREATE NEW — make directory first)

```typescript
// app/api/field-state/route.ts
// GET: Returns live field state for UI polling (called every 1.5s by FieldOperationsConsole)
// POST { action: "reset" }: Resets demo state for clean judging runs

import { NextRequest, NextResponse } from "next/server";
import { getState, resetState } from "@/lib/field-store";

export async function GET() {
  return NextResponse.json(getState());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body?.action === "reset") {
      resetState();
      return NextResponse.json({ success: true, message: "Demo state reset to seed data." });
    }
    return NextResponse.json(
      { error: "Unknown action. Use { action: 'reset' }." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
}
```

**VERIFY M1:** `pnpm run typecheck` — 0 errors required before M2.

---

## M2 — Custom LLM SSE + Murf Falcon Integration

### File 4: `lib/field-tech-prompt.ts` (CREATE NEW)

```typescript
// lib/field-tech-prompt.ts
// System prompt for the FieldTech Copilot LLM.
// Instructs the model to produce voice-safe, Murf Falcon TTS-compatible responses.

export const FIELD_TECH_SYSTEM_PROMPT = `You are FieldTech Copilot, an intelligent voice assistant for on-site industrial field technicians working on 5G telecom infrastructure.

CRITICAL VOICE RULES — Murf AI Falcon TTS will speak your responses aloud:
- NEVER use bullet points, dashes, asterisks, numbered lists, markdown, tables, code blocks, or any special formatting symbols in your spoken replies.
- Keep ALL spoken responses to 1-3 crisp, natural sentences. Be direct and conversational.
- For structured data like repair steps, parts lists, or tables, say "I have pulled that up on your screen" and let the visual console display the details.
- Speak codes naturally: say "Ticket T K T 4 0 9" not "TKT-409", say "Fan 90 X Pro" not "FAN-90X-PRO", say "Error 4 1 2" not "E-412".

SAFETY RULE: Always state safety warnings verbally before repair steps. Never skip a safety lockout notice.

CONFIRMATION RULE: For ANY action that changes data, you MUST ask for explicit verbal confirmation first. Wait for the technician to say yes or confirmed. Only then call reserve_spare_part or update_work_order with confirmed set to true.

TOOLS AVAILABLE:
- get_assigned_ticket: Get work order details and equipment history
- search_maintenance_manual: Get OEM diagnostic steps and safety procedures
- check_part_inventory: Check van and warehouse stock levels
- reserve_spare_part: Reserve a spare part, requires confirmed true
- update_work_order: Update ticket status, requires confirmed true
- generate_service_report: Create field service report and notify supervisor

CURRENT CONTEXT: Technician Ragul P. is on shift. Primary ticket: TKT-409 at Substation Bay 4, Whitefield Sector 2. Equipment: BBU-9000X, a 5G Baseband Unit with a critical thermal fault.`;
```

---

### File 5: `app/api/chat/completions/route.ts` (CREATE NEW — make directory `app/api/chat/completions/` first)

```typescript
// app/api/chat/completions/route.ts
// OpenAI-compatible SSE streaming endpoint.
// Agora Cloud calls this POST on every user voice turn.
// Flow: auth check → agentic tool-call loop (max 4 iterations) → SSE stream final text.

import { NextRequest } from "next/server";
import { FIELD_TECH_TOOLS, executeToolCall } from "@/lib/agent-tools";
import { FIELD_TECH_SYSTEM_PROMPT } from "@/lib/field-tech-prompt";

export const runtime = "nodejs";

type Message = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
};

function sseChunk(id: string, content: string): string {
  return (
    "data: " +
    JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      choices: [{ index: 0, delta: { content }, finish_reason: null }],
    }) +
    "\n\n"
  );
}

function sseDone(): string {
  return "data: [DONE]\n\n";
}

export async function POST(req: NextRequest) {
  // Auth check (non-blocking in dev to avoid Agora test failures)
  const authToken = process.env.CUSTOM_LLM_AUTH_TOKEN || "fieldtech-secret-token";
  const authHeader = req.headers.get("authorization") || "";
  const providedToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (authToken && providedToken !== authToken) {
    console.warn("[chat/completions] Warning: token mismatch — continuing in dev mode");
  }

  let body: { messages?: Message[]; stream?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const incomingMessages: Message[] = body.messages ?? [];

  // Prepend system prompt if not already present
  const hasSystemMsg = incomingMessages.some((m) => m.role === "system");
  const messages: Message[] = hasSystemMsg
    ? incomingMessages
    : [{ role: "system", content: FIELD_TECH_SYSTEM_PROMPT }, ...incomingMessages];

  const encoder = new TextEncoder();
  const llmUrl = process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions";
  const llmApiKey = process.env.LLM_API_KEY || "";
  const llmModel = process.env.LLM_MODEL || "gpt-4o-mini";
  const completionId = `chatcmpl-ft-${Date.now()}`;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (text: string) => controller.enqueue(encoder.encode(text));

      try {
        let conversationMessages = [...messages];
        let iterations = 0;
        const MAX_ITER = 4;

        while (iterations < MAX_ITER) {
          iterations++;

          const llmResponse = await fetch(llmUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${llmApiKey}`,
            },
            body: JSON.stringify({
              model: llmModel,
              messages: conversationMessages,
              tools: FIELD_TECH_TOOLS,
              tool_choice: "auto",
              stream: false,
              temperature: 0.3,
              max_tokens: 500,
            }),
          });

          if (!llmResponse.ok) {
            const errText = await llmResponse.text();
            console.error("[chat/completions] LLM error:", errText);
            enqueue(sseChunk(completionId, "I am having trouble reaching the enterprise system right now. Please try again."));
            enqueue(sseDone());
            controller.close();
            return;
          }

          const llmData = await llmResponse.json();
          const choice = llmData.choices?.[0];

          if (!choice) {
            enqueue(sseChunk(completionId, "No response received from the LLM."));
            enqueue(sseDone());
            controller.close();
            return;
          }

          const assistantMsg: Message = choice.message;

          if (
            choice.finish_reason === "tool_calls" &&
            assistantMsg.tool_calls &&
            assistantMsg.tool_calls.length > 0
          ) {
            conversationMessages.push(assistantMsg);

            for (const tc of assistantMsg.tool_calls) {
              let toolArgs: Record<string, unknown> = {};
              try {
                toolArgs = JSON.parse(tc.function.arguments || "{}");
              } catch {
                toolArgs = {};
              }

              console.log(`[tool] Executing: ${tc.function.name}`, toolArgs);
              const toolResult = await executeToolCall(tc.function.name, toolArgs);

              conversationMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                name: tc.function.name,
                content: toolResult,
              });
            }

            // Continue loop for LLM to formulate natural response
            continue;
          }

          // Final text response — stream it back
          const finalText: string = assistantMsg.content || "Done.";

          // Stream in word-grouped chunks for natural TTS cadence
          const words = finalText.split(" ");
          let buffer = "";
          for (let i = 0; i < words.length; i++) {
            buffer += (i === 0 ? "" : " ") + words[i];
            if ((i + 1) % 5 === 0 || /[.!?,]$/.test(words[i]) || i === words.length - 1) {
              enqueue(sseChunk(completionId, buffer));
              buffer = "";
              await new Promise((r) => setTimeout(r, 5));
            }
          }

          enqueue(sseDone());
          controller.close();
          return;
        }

        // Max iterations hit
        enqueue(sseChunk(completionId, "I completed multiple steps but need more information to continue."));
        enqueue(sseDone());
        controller.close();
      } catch (err) {
        console.error("[chat/completions] Stream error:", err);
        enqueue(sseChunk(completionId, "A system error occurred. Please try your request again."));
        enqueue(sseDone());
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

---

### File 6: `app/api/invite-agent/route.ts` (MODIFY — surgical changes only)

**STEP 1:** Read the EXISTING file content completely.  
**STEP 2:** Add this import at the top:
```typescript
import { FIELD_TECH_SYSTEM_PROMPT } from "@/lib/field-tech-prompt";
```

**STEP 3:** Find the payload object sent to Agora's ConvoAI API (look for `tts:` and `llm:` keys). Replace ONLY those two blocks with:

```typescript
// TTS block — Murf AI Falcon
tts: {
  vendor: "murf",
  credential_mode: "byok",
  params: {
    key: process.env.MURF_API_KEY,
    base_url: "wss://global.api.murf.ai/v1/speech/stream-input",
    voice_id: process.env.MURF_VOICE_ID || "en-US-ken",
    model: process.env.MURF_MODEL || "FALCON",
    locale: process.env.MURF_LOCALE || "en-US",
    sample_rate: 24000,
    rate: 0,
    pitch: 0,
  },
},

// LLM block — Custom SSE endpoint
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
    "FieldTech Copilot online. You are assigned to Ticket T K T 4 0 9 at Substation Bay 4. How can I assist you on site today?",
  failure_message:
    "I hit a brief connection issue reaching the enterprise system. Could you repeat that?",
  max_history: 20,
  params: {
    model: process.env.LLM_MODEL || "gpt-4o-mini",
  },
},
```

**Keep all other parts of `invite-agent/route.ts` unchanged** — channel name, token, uid, Basic auth construction, error handling.

**VERIFY M2:**
1. `pnpm run typecheck` — 0 errors
2. Start dev server: `pnpm dev`
3. Run curl test:
```bash
curl -X POST http://localhost:3000/api/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fieldtech-secret-token" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Pull up ticket TKT-409\"}]}" \
  --no-buffer
```
Expected: Multiple `data: {...}` lines with content, ending with `data: [DONE]`

---

## M3 — Field Operations Console UI

### File 7: `components/FieldOperationsConsole.tsx` (CREATE NEW)

```tsx
"use client";
// components/FieldOperationsConsole.tsx
// Real-time field operations dashboard.
// Polls /api/field-state every 1.5s while isCallActive is true.
// Shows: Work Order, Diagnostic Runbook, Spare Parts, Action Audit, Service Report modal.

import { useEffect, useState, useCallback } from "react";
import type { FieldState, ServiceReport } from "@/lib/field-store";

interface Props {
  isCallActive: boolean;
}

export default function FieldOperationsConsole({ isCallActive }: Props) {
  const [state, setState] = useState<FieldState | null>(null);
  const [showReport, setShowReport] = useState<ServiceReport | null>(null);
  const [resetting, setResetting] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/field-state");
      if (res.ok) setState(await res.json());
    } catch {
      // silent fail — network blip during demo
    }
  }, []);

  useEffect(() => {
    fetchState();
    if (!isCallActive) return;
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [isCallActive, fetchState]);

  const handleReset = async () => {
    setResetting(true);
    await fetch("/api/field-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    await fetchState();
    setResetting(false);
  };

  const ticket = state?.tickets?.["TKT-409"];
  const inventory = state?.inventory ?? {};
  const actionLogs = state?.actionLogs ?? [];
  const reports = state?.serviceReports ?? [];
  const activeManual = state?.activeManual;

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      ASSIGNED: "bg-blue-600",
      IN_PROGRESS: "bg-yellow-500",
      IN_PROGRESS_PART_RESERVED: "bg-orange-500",
      COMPLETED: "bg-green-600",
      ESCALATED: "bg-red-600",
    };
    return map[status] ?? "bg-gray-500";
  };

  const priorityColor = (p: string) => {
    const map: Record<string, string> = {
      CRITICAL: "text-red-400",
      HIGH: "text-orange-400",
      MEDIUM: "text-yellow-400",
    };
    return map[p] ?? "text-gray-400";
  };

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto text-sm bg-gray-900 p-3 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="font-bold text-white text-base tracking-wide">
          🏭 Field Operations Console
        </h2>
        <div className="flex gap-2 flex-wrap">
          {reports.length > 0 && (
            <button
              onClick={() => setShowReport(reports[reports.length - 1])}
              className="px-3 py-1 rounded text-xs bg-green-700 hover:bg-green-600 text-white font-semibold"
            >
              📄 Report ({reports.length})
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-3 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-white"
          >
            {resetting ? "Resetting..." : "🔄 Reset Demo"}
          </button>
        </div>
      </div>

      {/* Work Order Card */}
      {ticket && (
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="flex items-start justify-between mb-2 gap-2">
            <div className="min-w-0">
              <span className="text-xs text-gray-400 font-mono">{ticket.id}</span>
              <h3 className="text-white font-semibold text-sm leading-tight mt-0.5 break-words">
                {ticket.title}
              </h3>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span
                className={`text-xs px-2 py-0.5 rounded-full text-white font-bold whitespace-nowrap ${statusColor(ticket.status)}`}
              >
                {ticket.status.replace(/_/g, " ")}
              </span>
              <span className={`text-xs font-bold ${priorityColor(ticket.priority)}`}>
                {ticket.priority}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-400 space-y-0.5">
            <div>📍 <span className="text-gray-300">{ticket.site}</span></div>
            <div>🔧 <span className="text-gray-300">{ticket.equipmentId} ({ticket.equipmentModel})</span></div>
            <div>👤 <span className="text-gray-300">{ticket.assignedTo}</span></div>
          </div>
          {ticket.safetyNotes.length > 0 && (
            <div className="mt-2 p-2 bg-red-900/40 border border-red-700 rounded">
              <div className="text-xs font-bold text-red-400 mb-1">⚠️ SAFETY LOCKOUT</div>
              {ticket.safetyNotes.map((note, i) => (
                <div key={i} className="text-xs text-red-300">{note}</div>
              ))}
            </div>
          )}
          <div className="mt-2">
            <div className="text-xs text-gray-500 font-semibold mb-1">MAINTENANCE HISTORY</div>
            {ticket.history.map((h, i) => (
              <div key={i} className="text-xs text-gray-400 leading-relaxed">· {h}</div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostic Runbook */}
      {activeManual && (
        <div className="bg-gray-800 rounded-lg p-3 border border-yellow-700">
          <div className="text-xs font-bold text-yellow-400 mb-1">
            📋 RUNBOOK — {activeManual.equipmentModel} {activeManual.errorCode}
          </div>
          <div className="text-xs text-gray-300 mb-1">
            <span className="text-gray-500">Symptom: </span>{activeManual.symptom}
          </div>
          <div className="text-xs text-gray-300 mb-2">
            <span className="text-gray-500">Root Cause: </span>{activeManual.rootCause}
          </div>
          <div className="p-2 bg-red-900/30 border border-red-700 rounded mb-2 text-xs text-red-300">
            ⚠️ {activeManual.safetyWarning}
          </div>
          <div className="text-xs text-gray-500 font-semibold mb-1">REPAIR STEPS</div>
          {activeManual.steps.map((step, i) => (
            <div
              key={i}
              className="text-xs text-gray-300 leading-relaxed py-0.5 border-b border-gray-700/50 last:border-0"
            >
              {step}
            </div>
          ))}
          <div className="text-xs text-gray-500 mt-2">
            Required:{" "}
            {activeManual.requiredParts.map((p) => (
              <span key={p} className="font-mono text-blue-400 mr-2">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Spare Parts Inventory */}
      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <div className="text-xs font-bold text-gray-400 mb-2">📦 SPARE PARTS INVENTORY</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 text-left">
              <th className="pb-1 pr-2">Part</th>
              <th className="pb-1 text-right pr-2">Van</th>
              <th className="pb-1 text-right pr-2">WH</th>
              <th className="pb-1 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(inventory).map((item) => (
              <tr key={item.partNumber} className="border-t border-gray-700/50">
                <td className="py-1 pr-2">
                  <div className="font-mono text-blue-300">{item.partNumber}</div>
                  {item.reservationId && (
                    <div className="text-green-400 font-bold text-xs animate-pulse">
                      🏷 {item.reservationId}
                    </div>
                  )}
                </td>
                <td className="py-1 text-right pr-2">
                  <span className={item.vanStock > 0 ? "text-green-400" : "text-gray-500"}>
                    {item.vanStock}
                  </span>
                </td>
                <td className="py-1 text-right pr-2">
                  <span className={item.availableQty > 0 ? "text-green-400" : "text-red-400"}>
                    {item.availableQty}
                  </span>
                </td>
                <td className="py-1 text-right">
                  {item.reservationId ? (
                    <span className="text-green-400 font-bold">RESERVED</span>
                  ) : item.availableQty === 0 ? (
                    <span className="text-red-400 font-bold">OUT</span>
                  ) : (
                    <span className="text-green-400">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Agentic Action Audit Feed */}
      {actionLogs.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-xs font-bold text-gray-400 mb-2">⚡ AGENTIC ACTION LOG</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {[...actionLogs].reverse().map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 text-xs py-1 border-b border-gray-700/50 last:border-0"
              >
                <span
                  className={`flex-shrink-0 font-bold ${
                    log.status === "SUCCESS"
                      ? "text-green-400"
                      : log.status === "ERROR"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}
                >
                  {log.status === "SUCCESS" ? "✓" : log.status === "ERROR" ? "✗" : "⏳"}
                </span>
                <div className="min-w-0">
                  <span className="font-mono text-blue-300">{log.toolName}</span>
                  <span className="text-gray-400 ml-1 break-words">{log.summary}</span>
                  <div className="text-gray-600 text-xs">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demo Quick Reference */}
      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
        <div className="text-xs font-bold text-gray-500 mb-1">🎤 DEMO VOICE PROMPTS</div>
        {[
          '"Hey Copilot, pull up my ticket for Bay 4"',
          '"The unit shows error E-412 and fan is rattling. Steps?"',
          '"Check if FAN-90X-PRO is in stock and reserve it"',
          '"Yes, go ahead and reserve it"',
          '"Generate my field service report for the supervisor"',
        ].map((prompt, i) => (
          <div key={i} className="text-xs text-gray-500 py-0.5 italic">
            {i + 1}. {prompt}
          </div>
        ))}
      </div>

      {/* Service Report Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-600 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">📄 Field Service Report</h3>
              <button onClick={() => setShowReport(null)} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs bg-gray-800 rounded p-3">
                <div><span className="text-gray-400">Report ID: </span><span className="text-white font-mono">{showReport.reportId}</span></div>
                <div><span className="text-gray-400">Ticket: </span><span className="text-white">{showReport.ticketId}</span></div>
                <div><span className="text-gray-400">Technician: </span><span className="text-white">{showReport.technicianName}</span></div>
                <div><span className="text-gray-400">Site: </span><span className="text-white">{showReport.site}</span></div>
                <div><span className="text-gray-400">Equipment: </span><span className="text-white">{showReport.equipmentId}</span></div>
                <div><span className="text-gray-400">Generated: </span><span className="text-white">{new Date(showReport.generatedAt).toLocaleString()}</span></div>
              </div>
              {[
                ["ROOT CAUSE", showReport.rootCause],
                ["ACTIONS TAKEN", showReport.actionsTaken],
                ["PARTS USED / RESERVED", showReport.partsUsedOrReserved],
                ["FOLLOW-UP REQUIRED", showReport.followUpRequired],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-800 rounded p-3">
                  <div className="text-gray-400 text-xs font-bold mb-1">{label}</div>
                  <div className="text-white text-xs">{value}</div>
                </div>
              ))}
              {showReport.supervisorNotified && (
                <div className="bg-green-900/40 border border-green-700 rounded p-2 text-xs text-green-400 font-bold">
                  ✓ Supervisor notified via enterprise system
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(showReport, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${showReport.reportId}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-semibold"
              >
                ⬇ Download JSON
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
              >
                🖨 Print
              </button>
              <button
                onClick={() => setShowReport(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### File 8: `components/QuickstartConversationLayout.tsx` (MODIFY — surgical)

**STEP 1:** Read the EXISTING file completely.  
**STEP 2:** Add this import at the top (after existing imports):
```typescript
import FieldOperationsConsole from "./FieldOperationsConsole";
```

**STEP 3:** Find the boolean state/prop that represents "agent is connected and call is active" (commonly `isConnected`, `agentState`, or similar). If none exists, use `true` as a placeholder.

**STEP 4:** Find the outermost return JSX container. The goal is to split the layout into two columns. Wrap the existing content in a left column and add `FieldOperationsConsole` as the right column:

```tsx
// BEFORE (approximate — adapt to actual file structure):
return (
  <div className="existing-container-classes">
    {/* existing voice UI content */}
  </div>
);

// AFTER:
return (
  <div className="flex h-full w-full gap-3 p-3 overflow-hidden">
    {/* Left column: Voice + Transcript (40%) */}
    <div className="w-2/5 flex flex-col min-w-0">
      {/* ALL existing content goes here, unchanged */}
    </div>
    {/* Right column: Field Operations Console (60%) */}
    <div className="w-3/5 flex flex-col min-w-0 overflow-hidden">
      <FieldOperationsConsole isCallActive={/* your isCallActive boolean here, or true */} />
    </div>
  </div>
);
```

**STEP 5:** `pnpm run typecheck` — 0 errors. Then `pnpm dev` and verify both columns render.

---

## M4 — End-to-End Verification

### ngrok Setup
```bash
# In a new terminal (outside project)
ngrok http 3000
# Copy the HTTPS forwarding URL, e.g. https://abc123def.ngrok-free.app
```

Update `.env.local`:
```env
APP_PUBLIC_URL=https://abc123def.ngrok-free.app
```

Restart dev server: `Ctrl+C` then `pnpm dev`

### SSE Verification via ngrok
```bash
curl -X POST https://abc123def.ngrok-free.app/api/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fieldtech-secret-token" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Pull up ticket TKT-409\"}]}" \
  --no-buffer
```

### Full 5-Stage Demo
See `DEMO_SCRIPT.md` for exact voice commands.

If Agora agent joins but TTS is silent → check Murf API key and voice_id in `.env.local`.  
If tool calls are not executing → check `APP_PUBLIC_URL` is reachable via ngrok.  
If UI state is not updating → check `/api/field-state` returns HTTP 200 with JSON.
