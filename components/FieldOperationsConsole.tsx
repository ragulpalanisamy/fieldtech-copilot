'use client';

// components/FieldOperationsConsole.tsx
// Real-time field operations dashboard.
// Polls /api/field-state every 1.5s while active.
// Shows: Work Order, Diagnostic Runbook, Spare Parts, Action Audit, and Service Report modal.

import { useEffect, useState, useCallback } from 'react';
import type { FieldState, ServiceReport } from '@/lib/field-store';

interface FieldOperationsConsoleProps {
  isCallActive?: boolean;
}

export default function FieldOperationsConsole({
  isCallActive = true,
}: FieldOperationsConsoleProps) {
  const [state, setState] = useState<FieldState | null>(null);
  const [showReport, setShowReport] = useState<ServiceReport | null>(null);
  const [resetting, setResetting] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/field-state');
      if (res.ok) {
        const data = (await res.json()) as FieldState;
        setState(data);
      }
    } catch {
      // Non-blocking in case of network blips during call
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
    try {
      await fetch('/api/field-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      await fetchState();
    } finally {
      setResetting(false);
    }
  };

  const ticket = state?.tickets?.['TKT-409'];
  const inventory = state?.inventory ?? {};
  const actionLogs = state?.actionLogs ?? [];
  const reports = state?.serviceReports ?? [];
  const activeManual = state?.activeManual;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return 'bg-blue-600/90 text-blue-100 border-blue-500';
      case 'IN_PROGRESS':
        return 'bg-amber-600/90 text-amber-100 border-amber-500';
      case 'IN_PROGRESS_PART_RESERVED':
        return 'bg-orange-600/90 text-orange-100 border-orange-400';
      case 'COMPLETED':
        return 'bg-emerald-600/90 text-emerald-100 border-emerald-500';
      case 'ESCALATED':
        return 'bg-rose-600/90 text-rose-100 border-rose-500';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-600/50';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-600/50';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-400 border-blue-600/50';
      default:
        return 'bg-muted/20 text-muted-foreground border-border';
    }
  };



  return (
    <div className="flex h-full flex-col gap-3.5 overflow-y-auto rounded-xl border border-border bg-card/60 p-4 text-card-foreground shadow-sm backdrop-blur-sm">
      {/* Top Action Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground md:text-base">
            Field Operations Console
          </h2>
          <span className="hidden rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground sm:inline-block">
            Substation Bay 4
          </span>
        </div>

        <div className="flex items-center gap-2">
          {reports.length > 0 && (
            <button
              onClick={() => setShowReport(reports[reports.length - 1])}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <span>📄 View Report</span>
              <span className="rounded-full bg-emerald-800/80 px-1.5 py-0.2 text-[10px]">
                {reports.length}
              </span>
            </button>
          )}

          <button
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            title="Reset demo data to initial baseline"
          >
            {resetting ? 'Resetting...' : '🔄 Reset Demo'}
          </button>
        </div>
      </div>

      {/* Card 1: Active Work Order (TKT-409) */}
      {ticket ? (
        <section className="rounded-lg border border-border bg-background/80 p-3.5 shadow-xs transition hover:border-border/80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary">
                  {ticket.id}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${getStatusColor(
                    ticket.status,
                  )}`}
                >
                  {ticket.status.replace(/_/g, ' ')}
                </span>
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${getPriorityBadge(
                    ticket.priority,
                  )}`}
                >
                  ⚡ {ticket.priority}
                </span>
              </div>
              <h3 className="mt-1 text-sm font-semibold text-foreground">
                {ticket.title}
              </h3>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <span className="text-foreground/70">📍 Site:</span>{' '}
              <span className="font-medium text-foreground">{ticket.site}</span>
            </div>
            <div>
              <span className="text-foreground/70">🔧 Unit:</span>{' '}
              <span className="font-medium text-foreground">
                {ticket.equipmentId} ({ticket.equipmentModel})
              </span>
            </div>
            <div>
              <span className="text-foreground/70">👤 Tech:</span>{' '}
              <span className="font-medium text-foreground">{ticket.assignedTo}</span>
            </div>
          </div>

          {/* Red Safety Lockout Warning */}
          {ticket.safetyNotes.length > 0 && (
            <div className="mt-3 rounded-md border border-rose-800/60 bg-rose-950/40 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-rose-300">
                <span>⚠️</span>
                <span>MANDATORY SAFETY LOCKOUT NOTICE</span>
              </div>
              <ul className="mt-1 space-y-0.5 pl-4 text-rose-200/90 list-disc">
                {ticket.safetyNotes.map((note, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Chronological Maintenance Notes */}
          <div className="mt-3 border-t border-border/60 pt-2 text-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Maintenance Timeline
            </span>
            <div className="mt-1 space-y-1">
              {ticket.history.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-1.5 text-muted-foreground"
                >
                  <span className="text-primary">•</span>
                  <span className="leading-snug">{entry}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-border/60 p-4 text-center text-xs text-muted-foreground">
          Loading assigned work orders...
        </div>
      )}

      {/* Card 2: Diagnostic & Safety Runbook */}
      {activeManual && (
        <section className="rounded-lg border border-amber-600/60 bg-amber-950/20 p-3.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-amber-800/40 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">📋</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                OEM Diagnostic Runbook — {activeManual.equipmentModel}{' '}
                {activeManual.errorCode}
              </h4>
            </div>
            <span className="rounded bg-amber-900/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-200">
              STEP-BY-STEP
            </span>
          </div>

          <div className="mt-2 space-y-1 text-xs text-foreground/90">
            <div>
              <span className="text-amber-400/90 font-medium">Symptom:</span>{' '}
              {activeManual.symptom}
            </div>
            <div>
              <span className="text-amber-400/90 font-medium">Root Cause:</span>{' '}
              {activeManual.rootCause}
            </div>
          </div>

          <div className="my-2.5 rounded-md border border-rose-800/70 bg-rose-950/50 p-2 text-xs font-medium text-rose-200">
            🚨 {activeManual.safetyWarning}
          </div>

          <div className="space-y-1 text-xs">
            <div className="font-semibold text-foreground/80">Repair Procedure:</div>
            <ol className="space-y-1 pl-4 text-foreground/80 list-decimal">
              {activeManual.steps.map((step, idx) => (
                <li key={idx} className="leading-relaxed">
                  {step.replace(/^\d+\.\s*/, '')}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-amber-800/40 pt-2 text-xs">
            <span className="font-semibold text-muted-foreground">Required Parts:</span>
            <div className="flex flex-wrap gap-1.5">
              {activeManual.requiredParts.map((part) => (
                <span
                  key={part}
                  className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] font-bold text-primary"
                >
                  {part}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Card 3: Spare Parts Inventory */}
      <section className="rounded-lg border border-border bg-background/80 p-3.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/80 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
            <span>📦</span>
            <span>Spare Parts & Warehouse Stock</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Van #12 vs BLR-EAST-HUB
          </span>
        </div>

        <div className="mt-2.5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="pb-1.5 font-semibold">Part Number & Description</th>
                <th className="pb-1.5 text-center font-semibold">Van #12</th>
                <th className="pb-1.5 text-center font-semibold">BLR Hub</th>
                <th className="pb-1.5 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {Object.values(inventory).map((item) => (
                <tr key={item.partNumber} className="group hover:bg-muted/30">
                  <td className="py-2 pr-2">
                    <div className="font-mono font-semibold text-foreground">
                      {item.partNumber}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.name}
                    </div>
                    {item.reservationId && (
                      <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-emerald-950/70 px-1.5 py-0.2 font-mono text-[10px] font-bold text-emerald-400 border border-emerald-700/60 animate-pulse">
                        <span>🏷</span>
                        <span>{item.reservationId} (RESERVED)</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-center">
                    <span
                      className={`font-semibold ${
                        item.vanStock > 0 ? 'text-emerald-400' : 'text-muted-foreground'
                      }`}
                    >
                      {item.vanStock}
                    </span>
                  </td>
                  <td className="py-2 text-center">
                    <span
                      className={`font-semibold ${
                        item.availableQty > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.availableQty}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {item.reservationId ? (
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/30">
                        RESERVED
                      </span>
                    ) : item.availableQty === 0 ? (
                      <span className="rounded bg-rose-500/20 px-2 py-0.5 font-bold text-rose-400 border border-rose-500/30">
                        OUT
                      </span>
                    ) : (
                      <span className="rounded bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                        AVAILABLE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Card 4: Agentic Action Audit Timeline */}
      <section className="rounded-lg border border-border bg-background/80 p-3.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/80 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
            <span>⚡</span>
            <span>Agentic Action Audit Feed</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {actionLogs.length} events
          </span>
        </div>

        {actionLogs.length > 0 ? (
          <div className="mt-2.5 max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {[...actionLogs].reverse().map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 rounded-md border border-border/50 bg-card/40 p-2 text-xs transition hover:bg-card/70"
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    log.status === 'SUCCESS'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : log.status === 'ERROR'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {log.status === 'SUCCESS' ? '✓' : log.status === 'ERROR' ? '✗' : '⏳'}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[11px] font-semibold text-primary">
                      {log.toolName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-foreground/80 leading-snug">
                    {log.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-center text-xs text-muted-foreground">
            No agentic actions recorded yet. Speak a voice command to execute tools.
          </div>
        )}
      </section>

      {/* Field Service Report Modal */}
      {showReport && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Formal Field Service Report
                  </h3>
                  <span className="font-mono text-xs text-primary">
                    {showReport.reportId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowReport(null)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground text-lg leading-none"
                aria-label="Close report"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 overflow-y-auto pr-1 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background p-3 text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">Ticket ID:</span>{' '}
                  {showReport.ticketId}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Technician:</span>{' '}
                  {showReport.technicianName}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Site Location:</span>{' '}
                  {showReport.site}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Equipment:</span>{' '}
                  {showReport.equipmentId}
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-foreground">Generated At:</span>{' '}
                  {new Date(showReport.generatedAt).toLocaleString()}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Root Cause
                </div>
                <p className="mt-1 text-foreground/90">{showReport.rootCause}</p>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Actions Performed
                </div>
                <p className="mt-1 text-foreground/90">{showReport.actionsTaken}</p>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Parts Replaced / Reserved
                </div>
                <p className="mt-1 font-mono text-primary">
                  {showReport.partsUsedOrReserved}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Follow-Up Instructions
                </div>
                <p className="mt-1 text-foreground/90">
                  {showReport.followUpRequired}
                </p>
              </div>

              {showReport.supervisorNotified && (
                <div className="rounded-md border border-emerald-700/60 bg-emerald-950/40 p-2.5 text-xs font-semibold text-emerald-300 flex items-center gap-2">
                  <span>✓</span>
                  <span>Supervisor notified via automated NOC escalation webhook</span>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob(
                      [JSON.stringify(showReport, null, 2)],
                      { type: 'application/json' },
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `service-report-${showReport.ticketId}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                >
                  ⬇ Download JSON
                </button>
                <button
                  onClick={() => window.print()}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  🖨 Print Report
                </button>
              </div>

              <button
                onClick={() => setShowReport(null)}
                className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
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
