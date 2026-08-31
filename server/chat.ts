import { aiRegistry } from './ai/provider.js';
import { memoryStore } from './memory.js';

const CHAT_SYSTEM = `You are JARVIS, the intelligent personal AI buddy and work operator for Shaheen Academy Jaipur.
You are not a paper generator unless the user explicitly asks for a production artifact.
Speak naturally like a capable human assistant: concise for simple questions, detailed when useful, and match Hindi, English or Hinglish.
Use supplied conversation history and relevant memory naturally.
Be proactive: if a request is ambiguous, ask only the minimum necessary clarification. Never fabricate completed actions, files, searches, or results.
For casual conversation, answer directly without headings or boilerplate.
For explanations, teach clearly with examples and correct terminology.
For planning, turn vague goals into a practical next step.
Do not output exam-paper formatting, question numbers, answer keys, options, or DOCX boilerplate unless the user explicitly asks for that kind of artifact.`;

function instantReply(prompt: string): string | null {
  const p = prompt.trim().toLowerCase().replace(/[!?.,]+$/g, '');
  if (/^(hi|hii|hello|hey|helo|namaste|namaskar)( jarvis)?$/.test(p)) return 'Hey! 👋 Main ready hoon. Batao, aaj kya karna hai?';
  if (/^(how are you|how r u|kaise ho|kese ho|kya haal hai|kya hal hai)( jarvis)?$/.test(p)) return 'Bilkul ready 😎 Systems online hain. Batao, kis kaam par lagna hai?';
  if (/^(thanks|thank you|thx|shukriya)$/.test(p)) return 'Anytime! 👍';
  return null;
}

export async function chatWithJarvis(prompt: string, model?: string, history: Array<{role:'user'|'assistant';content:string}> = []): Promise<string> {
  if (!prompt?.trim()) throw new Error('Message is required.');
  const instant = instantReply(prompt);
  if (instant) return instant;
  const memory = memoryStore.getMemoryPromptContext();
  const recent = history.slice(-10).map(m => `${m.role === 'user' ? 'USER' : 'JARVIS'}: ${m.content}`).join('\n');
  const composed = `${recent ? `RECENT CONVERSATION:\n${recent}\n\n` : ''}${memory ? `RELEVANT MEMORY:\n${memory}\n\n` : ''}CURRENT USER MESSAGE:\n${prompt.trim()}`;
  return aiRegistry.getProvider('gemini').generateText(composed, {
    systemInstruction: CHAT_SYSTEM,
    model: model || 'gemini-3.7-flash',
    temperature: 0.55,
  });
}
