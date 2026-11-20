// lib/agent-tools.ts
// OpenAI-compatible tool schemas and dispatcher for FieldTech Copilot.
// Intercepted and executed by the Custom LLM agentic loop.

import {
  getTicket,
  searchManual,
  getInventoryItem,
  reservePart,
  updateTicketStatus,
  addActionLog,
  addServiceReport,
} from './field-store';

export const FIELD_AGENT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_assigned_ticket',
      description:
        'Retrieves a work order ticket with equipment details and maintenance history. Use when technician asks about their current ticket, job, or assignment. Defaults to TKT-409.',
      parameters: {
        type: 'object',
        properties: {
          ticket_id: {
            type: 'string',
            description: 'Ticket ID, e.g. TKT-409. Defaults to TKT-409 if omitted.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_maintenance_manual',
      description:
        'Searches OEM maintenance manuals for diagnostic steps, safety procedures, and required parts. Use when technician reports an error code (e.g. E-412) or symptom.',
      parameters: {
        type: 'object',
        properties: {
          equipment_model: {
            type: 'string',
            description: 'Equipment model, e.g. BBU-9000X.',
          },
          error_code: {
            type: 'string',
            description: 'Error code reported by unit, e.g. E-412.',
          },
          symptom: {
            type: 'string',
            description: 'Symptom description if no error code is known.',
          },
        },
        required: ['equipment_model'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_part_inventory',
      description:
        'Checks van stock and regional warehouse stock for a spare part. Returns stock count and warehouse location. Use before reserving a part.',
      parameters: {
        type: 'object',
        properties: {
          part_number: {
            type: 'string',
            description: 'Spare part number, e.g. FAN-90X-PRO.',
          },
        },
        required: ['part_number'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'reserve_spare_part',
      description:
        'Reserves a spare part from warehouse inventory for a specific ticket. REQUIRES explicit verbal confirmation (confirmed=true). If the technician has not explicitly confirmed yet, set confirmed to false so the system asks for confirmation first.',
      parameters: {
        type: 'object',
        properties: {
          ticket_id: {
            type: 'string',
            description: 'Ticket ID to link the reservation to.',
          },
          part_number: {
            type: 'string',
            description: 'Spare part number to reserve, e.g. FAN-90X-PRO.',
          },
          warehouse: {
            type: 'string',
            description: 'Warehouse code where part is located, e.g. BLR-EAST-HUB.',
          },
          confirmed: {
            type: 'boolean',
            description:
              'Must be true only if the technician explicitly confirmed the reservation verbally.',
          },
        },
        required: ['ticket_id', 'part_number', 'warehouse', 'confirmed'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_work_order',
      description:
        'Updates work order ticket status and appends field notes. REQUIRES explicit verbal confirmation (confirmed=true).',
      parameters: {
        type: 'object',
        properties: {
          ticket_id: {
            type: 'string',
            description: 'Ticket ID, e.g. TKT-409.',
          },
          status: {
            type: 'string',
            description:
              'New status: IN_PROGRESS, IN_PROGRESS_PART_RESERVED, COMPLETED, or ESCALATED.',
          },
          notes: {
            type: 'string',
            description: 'Field notes to append to ticket history.',
          },
          confirmed: {
            type: 'boolean',
            description:
              'Must be true only if technician explicitly confirmed the update verbally.',
          },
        },
        required: ['ticket_id', 'status', 'notes', 'confirmed'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_service_report',
      description:
        'Generates formal field service report and notifies supervisor. Use when technician asks to wrap up, generate a report, or close the visit.',
      parameters: {
        type: 'object',
        properties: {
          ticket_id: {
            type: 'string',
            description: 'Ticket ID for the report, e.g. TKT-409.',
          },
          technician_name: {
            type: 'string',
            description: 'Technician name, e.g. Ragul P.',
          },
          root_cause: {
            type: 'string',
            description: 'Root cause of the fault.',
          },
          actions_taken: {
            type: 'string',
            description: 'Summary of diagnostic and repair actions.',
          },
          parts_used_or_reserved: {
            type: 'string',
            description: 'Parts used, replaced, or reserved.',
          },
          follow_up_required: {
            type: 'string',
            description: 'Any follow-up actions required, or "None" if resolved.',
          },
        },
        required: [
          'ticket_id',
          'technician_name',
          'root_cause',
          'actions_taken',
          'parts_used_or_reserved',
          'follow_up_required',
        ],
      },
    },
  },
];

export const FIELD_TECH_TOOLS = FIELD_AGENT_TOOLS;

type ToolArgs = Record<string, unknown>;

export async function executeToolCall(
  name: string,
  args: ToolArgs,
): Promise<string> {
  try {
    switch (name) {
      case 'get_assigned_ticket': {
        const ticketId = (args.ticket_id as string) || 'TKT-409';
        const ticket = getTicket(ticketId);
        if (!ticket) {
          addActionLog({
            toolName: 'get_assigned_ticket',
            status: 'ERROR',
            summary: `Ticket ${ticketId} not found in system`,
            details: { ticketId },
          });
          return JSON.stringify({ error: `Ticket ${ticketId} not found.` });
        }
        addActionLog({
          toolName: 'get_assigned_ticket',
          status: 'SUCCESS',
          summary: `Retrieved ticket ${ticketId}: ${ticket.title}`,
          details: { ticketId, status: ticket.status, priority: ticket.priority },
        });
        return JSON.stringify(ticket);
      }

      case 'search_maintenance_manual': {
        const model = args.equipment_model as string;
        const errorCode = args.error_code as string | undefined;
        const symptom = args.symptom as string | undefined;
        const manual = searchManual(model, errorCode, symptom);
        if (!manual) {
          addActionLog({
            toolName: 'search_maintenance_manual',
            status: 'ERROR',
            summary: `No manual found for ${model} ${errorCode ?? ''}`,
            details: { model, errorCode, symptom },
          });
          return JSON.stringify({
            error: `No manual found for model ${model} with error code ${errorCode ?? 'unknown'}.`,
          });
        }
        addActionLog({
          toolName: 'search_maintenance_manual',
          status: 'SUCCESS',
          summary: `Found manual: ${model} ${errorCode ?? ''} — ${manual.rootCause}`,
          details: { model, errorCode, stepsCount: manual.steps.length },
        });
        return JSON.stringify(manual);
      }

      case 'check_part_inventory': {
        const partNumber = args.part_number as string;
        const item = getInventoryItem(partNumber);
        if (!item) {
          addActionLog({
            toolName: 'check_part_inventory',
            status: 'ERROR',
            summary: `Part ${partNumber} not found in inventory`,
            details: { partNumber },
          });
          return JSON.stringify({ error: `Part ${partNumber} not found in inventory.` });
        }
        addActionLog({
          toolName: 'check_part_inventory',
          status: 'SUCCESS',
          summary: `${partNumber}: Van=${item.vanStock}, Warehouse=${item.availableQty} at ${item.warehouseName}`,
          details: {
            partNumber,
            vanStock: item.vanStock,
            availableQty: item.availableQty,
          },
        });
        return JSON.stringify({
          partNumber: item.partNumber,
          name: item.name,
          vanStock: item.vanStock,
          warehouse: `${item.warehouseName} (${item.warehouseCode}), Bin: ${item.bin}`,
          availableQty: item.availableQty,
          unitCost: item.unitCost,
          status: item.availableQty > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
          alternativePart: item.alternativePart,
        });
      }

      case 'reserve_spare_part': {
        const { ticket_id, part_number, warehouse, confirmed } = args as {
          ticket_id: string;
          part_number: string;
          warehouse: string;
          confirmed: boolean;
        };

        if (!confirmed) {
          addActionLog({
            toolName: 'reserve_spare_part',
            status: 'CONFIRMATION_REQUIRED',
            summary: `Awaiting technician confirmation to reserve ${part_number} for ${ticket_id}`,
            details: { ticket_id, part_number, warehouse },
          });
          return JSON.stringify({
            status: 'CONFIRMATION_REQUIRED',
            message: `Please confirm: reserve 1 unit of ${part_number} from ${warehouse} for ticket ${ticket_id}? Reply 'yes, go ahead' to confirm.`,
          });
        }

        const result = reservePart(part_number, ticket_id);
        if ('error' in result) {
          addActionLog({
            toolName: 'reserve_spare_part',
            status: 'ERROR',
            summary: result.error,
            details: { ticket_id, part_number, warehouse },
          });
          return JSON.stringify({ error: result.error });
        }

        addActionLog({
          toolName: 'reserve_spare_part',
          status: 'SUCCESS',
          summary: `Reserved ${part_number} — ID: ${result.reservationId}`,
          details: {
            ticket_id,
            part_number,
            warehouse,
            reservationId: result.reservationId,
          },
        });
        return JSON.stringify({
          status: 'RESERVED',
          reservationId: result.reservationId,
          partNumber: part_number,
          warehouse,
          remainingStock: result.item.availableQty,
          message: `Reservation confirmed. ID: ${result.reservationId}. Part ready for pickup at ${warehouse}.`,
        });
      }

      case 'update_work_order': {
        const { ticket_id, status, notes, confirmed } = args as {
          ticket_id: string;
          status: string;
          notes: string;
          confirmed: boolean;
        };

        if (!confirmed) {
          addActionLog({
            toolName: 'update_work_order',
            status: 'CONFIRMATION_REQUIRED',
            summary: `Awaiting confirmation to update ${ticket_id} to ${status}`,
            details: { ticket_id, status, notes },
          });
          return JSON.stringify({
            status: 'CONFIRMATION_REQUIRED',
            message: `Confirm updating ticket ${ticket_id} status to ${status}?`,
          });
        }

        const ticket = updateTicketStatus(ticket_id, status, notes);
        if (!ticket) {
          addActionLog({
            toolName: 'update_work_order',
            status: 'ERROR',
            summary: `Ticket ${ticket_id} not found for update`,
            details: { ticket_id, status },
          });
          return JSON.stringify({ error: `Ticket ${ticket_id} not found.` });
        }
        addActionLog({
          toolName: 'update_work_order',
          status: 'SUCCESS',
          summary: `Updated ${ticket_id} to status: ${status}`,
          details: { ticket_id, status, notes },
        });
        return JSON.stringify({
          status: 'UPDATED',
          ticketId: ticket.id,
          newStatus: ticket.status,
          message: `Ticket ${ticket_id} updated to ${status}.`,
        });
      }

      case 'generate_service_report': {
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
          site: ticket?.site ?? 'Substation Bay 4',
          equipmentId: ticket?.equipmentId ?? 'EQ-BBU-04',
          rootCause: root_cause,
          actionsTaken: actions_taken,
          partsUsedOrReserved: parts_used_or_reserved,
          followUpRequired: follow_up_required,
          supervisorNotified: true,
        });
        addActionLog({
          toolName: 'generate_service_report',
          status: 'SUCCESS',
          summary: `Service report ${report.reportId} generated for ${ticket_id}`,
          details: { reportId: report.reportId, supervisorNotified: true },
        });
        return JSON.stringify({
          status: 'REPORT_GENERATED',
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
    const message = err instanceof Error ? err.message : 'Unknown error';
    addActionLog({
      toolName: name,
      status: 'ERROR',
      summary: `Tool execution failed: ${message}`,
      details: { args, error: message },
    });
    return JSON.stringify({ error: `Tool ${name} failed: ${message}` });
  }
}
