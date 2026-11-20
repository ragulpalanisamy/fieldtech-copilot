// app/api/field-state/route.ts
// GET: Returns live field state for UI polling
// POST { action: "reset" }: Resets demo state for clean judging runs

import { NextRequest, NextResponse } from 'next/server';
import { getState, resetState } from '@/lib/field-store';

export async function GET() {
  return NextResponse.json(getState());
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { action?: string };
    if (body?.action === 'reset') {
      resetState();
      return NextResponse.json({
        success: true,
        message: 'Demo state reset to seed data.',
      });
    }
    return NextResponse.json(
      { error: "Unknown action. Use { action: 'reset' }." },
      { status: 400 },
    );
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
}
