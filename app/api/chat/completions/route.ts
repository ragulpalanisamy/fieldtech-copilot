import { NextRequest } from 'next/server';
import { handleFieldTechChatCompletions } from '@/lib/chat-completions';

export async function POST(request: NextRequest) {
  return handleFieldTechChatCompletions(request);
}
