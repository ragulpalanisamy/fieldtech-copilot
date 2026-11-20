'use client';

// components/QuickstartConversationLayout.tsx
// Split-screen Industrial Field Operations Console layout.
// Left Column: Voice Agent Visualizer + Mic Controls + Transcript Rail + Collapsible Demo Prompts.
// Right Column: FieldOperationsConsole (Live Work Order, Runbook, Inventory, Action Audit).

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import FieldOperationsConsole from './FieldOperationsConsole';

type QuickstartConversationLayoutProps = {
  statusPanel: ReactNode;
  pipelineMetrics: ReactNode;
  transcriptPanel: ReactNode;
  visualizer: ReactNode;
  controls: ReactNode;
  onEndConversation: () => void;
};

const DEMO_PROMPTS = [
  {
    step: '1. Initiate',
    text: "Hey Copilot, I'm on site at Substation Bay 4. Pull up my assigned ticket.",
  },
  {
    step: '2. Diagnose',
    text: "The unit is throwing error E-412 and fan is rattling. What's the diagnostic procedure?",
  },
  {
    step: '3. Reserve',
    text: 'Check if we have the replacement fan assembly in stock and reserve it.',
  },
  {
    step: '3b. Confirm',
    text: 'Yes, go ahead and reserve it.',
  },
  {
    step: '4. Report',
    text: 'Wrap up my visit log and generate the field service report for the supervisor.',
  },
];

export function QuickstartConversationLayout({
  statusPanel,
  pipelineMetrics,
  transcriptPanel,
  visualizer,
  controls,
  onEndConversation,
}: QuickstartConversationLayoutProps) {
  const [showCheatSheet, setShowCheatSheet] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPrompt(text);
    setTimeout(() => setCopiedPrompt(null), 1500);
  };

  return (
    <div className="flex h-screen min-h-0 flex-1 flex-col overflow-hidden text-left bg-background text-foreground">
      {/* Top Header Command Bar */}
      <header className="flex shrink-0 flex-col gap-3 border-b border-border bg-card/60 px-4 py-3 backdrop-blur-md md:h-[72px] md:flex-row md:items-center md:justify-between md:px-6 md:py-0">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/agora-logo-mark.svg"
            alt="Agora"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
          />
          <div className="flex min-w-0 flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-bold tracking-tight text-foreground md:text-lg">
                FieldTech Copilot
              </span>
              <span className="hidden rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary sm:inline-block">
                Voice AI at Work
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Agora ConvoAI + Murf Falcon TTS</span>
              <span className="text-border">•</span>
              {pipelineMetrics}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:pr-1">
          {statusPanel}
          <Button
            variant="destructive"
            size="sm"
            className="h-8 rounded-md border border-destructive bg-transparent px-3 text-xs font-medium text-destructive hover:bg-destructive/10"
            onClick={onEndConversation}
            aria-label="End conversation with AI agent"
            title="End conversation"
          >
            End Shift
          </Button>
        </div>
      </header>

      {/* Main Split-Screen Workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-3 md:p-4 lg:grid-cols-12">
        {/* Left Column (5 of 12 cols = ~42%): Voice Visualizer, Controls, Transcript & Cheatsheet */}
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden lg:col-span-5">
          {/* Top Voice Visualizer & Audio Controls */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/40 p-4 shadow-xs backdrop-blur-xs">
            <div
              className="relative flex h-36 w-full items-center justify-center sm:h-44"
              role="region"
              aria-label="AI agent status visualization"
            >
              {visualizer}
            </div>
            <div className="mt-2 shrink-0">{controls}</div>
          </div>

          {/* Collapsible Demo Voice Prompts Cheat Sheet */}
          <div className="rounded-lg border border-border bg-card/30 p-2.5 text-xs shadow-xs">
            <button
              onClick={() => setShowCheatSheet(!showCheatSheet)}
              className="flex w-full items-center justify-between text-left font-semibold text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <span>🎤</span>
                <span>Demo Voice Commands (Click to Copy)</span>
              </span>
              <span className="font-mono text-[11px]">{showCheatSheet ? '▲' : '▼'}</span>
            </button>

            {showCheatSheet && (
              <div className="mt-2 space-y-1.5 pt-1.5 border-t border-border/50">
                {DEMO_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCopy(p.text)}
                    className="flex w-full items-center justify-between gap-2 rounded bg-background/60 px-2 py-1 text-left transition hover:bg-accent hover:text-accent-foreground group"
                    title="Click to copy voice prompt"
                  >
                    <span className="truncate text-[11px] text-foreground/90 font-medium">
                      <span className="text-primary font-semibold mr-1">{p.step}:</span>
                      &quot;{p.text}&quot;
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-muted-foreground group-hover:text-foreground">
                      {copiedPrompt === p.text ? 'Copied ✓' : 'Copy'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Transcript Rail */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card/30 shadow-xs">
            {transcriptPanel}
          </div>
        </div>

        {/* Right Column (7 of 12 cols = ~58%): Enterprise Field Operations Console */}
        <div className="flex min-h-0 flex-col overflow-hidden lg:col-span-7">
          <FieldOperationsConsole isCallActive={true} />
        </div>
      </div>
    </div>
  );
}
