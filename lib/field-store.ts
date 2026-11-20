// lib/field-store.ts
// Singleton in-memory state store for FieldTech Copilot demo data.
// Survives hot reloads via module-level singleton.
// All state mutations go through exported functions — never mutate directly.

export interface Ticket {
  id: string;
  title: string;
  site: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
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
  status: 'SUCCESS' | 'ERROR' | 'CONFIRMATION_REQUIRED';
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
    'TKT-409': {
      id: 'TKT-409',
      title: '5G BBU-9000X Thermal Fault & Backhaul Flap',
      site: 'Substation Bay 4 - Whitefield Sector 2',
      priority: 'CRITICAL',
      status: 'ASSIGNED',
      assignedTo: 'Ragul P.',
      equipmentId: 'EQ-BBU-04',
      equipmentModel: 'BBU-9000X',
      history: [
        '2026-08-14: Routine filter clean — no anomalies',
        '2026-10-02: Minor high-temp warning (74°C) — cleared remotely',
        '2026-11-20: Critical thermal fault E-412 + backhaul flap reported by NOC',
      ],
      safetyNotes: [
        'LOCKOUT/TAGOUT: Engage DC breaker CB-04 before opening chassis',
        'Wait 60 seconds for capacitor discharge before touching internal components',
        'Minimum PPE: Class-E insulating gloves + safety glasses',
      ],
    },
    'TKT-412': {
      id: 'TKT-412',
      title: 'Optical Line Terminal Power Redundancy Check',
      site: 'POP Node 11 - Indiranagar',
      priority: 'MEDIUM',
      status: 'SCHEDULED',
      assignedTo: 'Ragul P.',
      equipmentId: 'EQ-OLT-11',
      equipmentModel: 'OLT-5000',
      history: ['2026-11-18: Scheduled preventive maintenance'],
      safetyNotes: ['Standard fiber PPE — laser safety goggles required'],
    },
  },
  manuals: [
    {
      equipmentModel: 'BBU-9000X',
      errorCode: 'E-412',
      symptom: 'Fan rotor speed < 1200 RPM + chassis temperature > 78°C',
      rootCause:
        'Bearing seizure on primary blower assembly FAN-90X-PRO causing insufficient airflow',
      requiredParts: ['FAN-90X-PRO', 'THM-PASTE-IND'],
      safetyWarning:
        'CRITICAL: Engage DC breaker CB-04 and wait 60 seconds for capacitor discharge before opening chassis. High-voltage risk.',
      steps: [
        '1. Verify DC isolation at breaker CB-04 — confirm LED is OFF',
        '2. Wait 60 seconds for capacitor discharge',
        '3. Unlatch front intake shroud (3x M4 quarter-turn fasteners)',
        '4. Disconnect FAN-90X-PRO connector (white 4-pin JST)',
        '5. Remove 4x M4 mounting screws (torque spec: 1.8 Nm)',
        '6. Install replacement FAN-90X-PRO — torque M4 screws to 1.8 Nm',
        '7. Apply THM-PASTE-IND to CPU heatsink (3mm bead, spread with applicator)',
        '8. Reconnect fan connector and reattach shroud',
        '9. Re-energize at CB-04 and run self-test via craft port: diag thermal --full',
        '10. Verify fan RPM > 2800 and chassis temp < 72°C within 5 minutes',
      ],
    },
    {
      equipmentModel: 'OLT-5000',
      errorCode: 'E-108',
      symptom: 'Battery bank float voltage drift > 0.5V from nominal',
      rootCause: 'Aging battery cells causing uneven charge distribution',
      requiredParts: ['BAT-48V-CELL'],
      safetyWarning:
        'Battery acid hazard. Wear chemical-resistant gloves and goggles. No open flames near battery bay.',
      steps: [
        '1. Connect calibrated multimeter to battery terminals',
        '2. Record individual cell voltages across all 12 cells',
        '3. Identify cells deviating > 0.3V from mean',
        '4. Replace identified cells with BAT-48V-CELL',
        '5. Run float charge equalization cycle (2 hours)',
        '6. Verify all cells within ±0.1V of nominal 48.6V',
      ],
    },
  ],
  inventory: {
    'FAN-90X-PRO': {
      partNumber: 'FAN-90X-PRO',
      name: 'BBU-9000X High-Static Cooling Fan Assembly',
      vanStock: 0,
      warehouseName: 'Bengaluru East Hub',
      warehouseCode: 'BLR-EAST-HUB',
      bin: 'B-14',
      availableQty: 4,
      unitCost: '$145.00',
    },
    'THM-PASTE-IND': {
      partNumber: 'THM-PASTE-IND',
      name: 'Industrial Ceramic Thermal Compound (5g)',
      vanStock: 3,
      warehouseName: 'Van #12 (On-Site)',
      warehouseCode: 'VAN-12',
      bin: 'DRAWER-2',
      availableQty: 3,
      unitCost: '$18.00',
    },
    'PSU-770': {
      partNumber: 'PSU-770',
      name: '48V DC Rectifier Module (Legacy)',
      vanStock: 0,
      warehouseName: 'Bengaluru East Hub',
      warehouseCode: 'BLR-EAST-HUB',
      bin: 'A-02',
      availableQty: 0,
      unitCost: '$320.00',
      alternativePart: 'PSU-770-REV2',
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
  note: string,
): Ticket | null {
  const ticket = _state.tickets[ticketId];
  if (!ticket) return null;
  ticket.status = status;
  ticket.history.push(`${new Date().toISOString().split('T')[0]}: ${note}`);
  return ticket;
}

export function searchManual(
  equipmentModel: string,
  errorCode?: string,
  symptom?: string,
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
  ticketId: string,
): { reservationId: string; item: InventoryItem } | { error: string } {
  const item = _state.inventory[partNumber.toUpperCase()];
  if (!item) return { error: `Part ${partNumber} not found in inventory.` };
  if (item.availableQty <= 0) {
    return {
      error: `OUT_OF_STOCK: ${partNumber} has 0 available. ${
        item.alternativePart
          ? `Alternative: ${item.alternativePart}`
          : 'No alternative available.'
      }`,
    };
  }
  item.availableQty -= 1;
  const reservationId = `RSV-${Math.floor(1000 + Math.random() * 9000)}`;
  item.reservationId = reservationId;
  item.reservedForTicket = ticketId;
  return { reservationId, item };
}

export function addActionLog(log: Omit<ActionLog, 'id' | 'timestamp'>): ActionLog {
  const entry: ActionLog = {
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...log,
  };
  _state.actionLogs.push(entry);
  return entry;
}

export function addServiceReport(
  report: Omit<ServiceReport, 'reportId' | 'generatedAt'>,
): ServiceReport {
  const entry: ServiceReport = {
    reportId: `RPT-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    ...report,
  };
  _state.serviceReports.push(entry);
  return entry;
}
