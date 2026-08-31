import { aiRegistry } from './ai/provider.js';
import { agentRegistry } from './agents/definitions.js';
import { memoryStore } from './memory.js';
import { generateDocxBuffer, DocxPaperData } from './docx-generator.js';
import { AttachedFile, ExecutionResult, GeneratedArtifact, TaskRecord, TaskStep, TaskStatus } from '../src/types/index.js';

export interface ExecuteTaskParams {
  userPrompt: string;
  selectedAgentId?: string;
  attachedFiles?: AttachedFile[];
  model?: string;
  settings?: {
    instituteName?: string;
    targetExam?: string;
    defaultTargetExam?: string;
    primaryLanguage?: string;
    aiModel?: string;
  };
}

const PAPER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    instituteName: { type: 'STRING' },
    examType: { type: 'STRING' },
    subject: { type: 'STRING' },
    duration: { type: 'STRING' },
    totalMarks: { type: 'STRING' },
    instructions: { type: 'ARRAY', items: { type: 'STRING' } },
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          number: { type: 'STRING' },
          textEn: { type: 'STRING' },
          textHi: { type: 'STRING' },
          options: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                en: { type: 'STRING' },
                hi: { type: 'STRING' },
              },
              required: ['en', 'hi'],
            },
          },
          correctOption: { type: 'STRING' },
          solution: { type: 'STRING' },
          diagramSvg: { type: 'STRING' },
        },
        required: ['number', 'textEn', 'textHi', 'options', 'correctOption', 'solution'],
      },
    },
  },
  required: ['title', 'instituteName', 'examType', 'subject', 'duration', 'totalMarks', 'instructions', 'questions'],
};

function isPaperAgent(agentId: string) {
  return agentId === 'neet-jee-paper' || agentId === 'dpp-generator' || agentId === 'pdf-bilingual';
}

function extractJson(text: string): any {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error('The AI returned an invalid structured document. JARVIS stopped before creating the Word file so no corrupted paper is produced.');
}

function requestedQuestionCount(prompt: string): number | null {
  const match = prompt.match(/\b(\d{1,3})\s*(?:questions?|qs?|प्रश्न)\b/i);
  return match ? Number(match[1]) : null;
}

function validatePaper(data: DocxPaperData, prompt: string) {
  const questions = data.questions || [];
  const expected = requestedQuestionCount(prompt);
  if (expected !== null && questions.length !== expected) {
    throw new Error(`Question-count validation failed: requested ${expected}, but AI returned ${questions.length}.`);
  }

  const seen = new Set<string>();
  for (const q of questions) {
    const n = String(q.number);
    if (seen.has(n)) throw new Error(`Question-number validation failed: duplicate Q.${n}.`);
    seen.add(n);
    if (!q.textEn?.trim()) throw new Error(`Question validation failed: Q.${n} has no English statement.`);
    if (!q.textHi?.trim()) throw new Error(`Question validation failed: Q.${n} has no Hindi statement.`);
    if (q.optionsEn && q.optionsEn.length > 0 && q.optionsEn.length !== 4) {
      throw new Error(`Option validation failed: Q.${n} does not have exactly four options.`);
    }
    if (q.optionsEn?.length === 4 && !/^[A-D]$/i.test(String(q.correctOption || ''))) {
      throw new Error(`Answer-key validation failed: Q.${n} has no valid A/B/C/D answer.`);
    }
  }
}

export class TaskRunner {
  static routeAgent(prompt: string, attachedFiles?: AttachedFile[], manualAgentId?: string): string {
    if (manualAgentId && manualAgentId !== 'auto') {
      const agent = agentRegistry.getAgent(manualAgentId);
      if (agent?.enabled) return agent.id;
    }

    const lower = prompt.toLowerCase();
    const hasPdf = attachedFiles?.some((f) => f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf'));

    if (['notice', 'poster', 'circular', 'ptm', 'holiday', 'vacation', 'announcement', 'seminar'].some((k) => lower.includes(k))) return 'poster-notice';
    if (['reel', 'short', 'video script', 'shot list', 'voiceover', '60 second', '30 second', 'video concept'].some((k) => lower.includes(k))) return 'reel-content';
    if (['instagram', 'facebook', 'youtube community', 'caption', 'hashtag', 'carousel', 'social media', 'admission open', 'promo post'].some((k) => lower.includes(k))) return 'social-media';
    if (['dpp', 'daily practice', 'practice problem', 'homework sheet', 'practice sheet'].some((k) => lower.includes(k))) return 'dpp-generator';

    if (hasPdf || lower.includes('pdf') || (lower.includes('read') && !!attachedFiles?.length)) {
      return lower.includes('paper') || lower.includes('neet') || lower.includes('jee') ? 'neet-jee-paper' : 'pdf-bilingual';
    }

    if (['neet', 'jee', 'question paper', 'test paper', 'exam paper', 'questions', 'physics', 'chemistry', 'biology', 'botany', 'zoology', 'maths', 'mathematics'].some((k) => lower.includes(k))) return 'neet-jee-paper';

    for (const a of agentRegistry.getAllAgents()) {
      if (a.isCustom && a.enabled && lower.includes(a.name.toLowerCase())) return a.id;
    }
    return 'neet-jee-paper';
  }

  static async execute(params: ExecuteTaskParams): Promise<TaskRecord> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const startTime = Date.now();
    const steps: TaskStep[] = [];
    const addStep = (status: TaskStatus, label: string, details?: string) => steps.push({ status, label, timestamp: new Date().toISOString(), details });

    addStep('waiting', 'JARVIS Task Initialized');
    const selectedAgentId = this.routeAgent(params.userPrompt, params.attachedFiles, params.selectedAgentId);
    const agent = agentRegistry.getAgent(selectedAgentId) || agentRegistry.getAgent('neet-jee-paper')!;
    addStep('understanding', `Intent understood. Routing to specialized agent: ${agent.name}`, `Selected Agent ID: ${agent.id}`);
    addStep('working', 'Validating parameters & grounding with JARVIS Memory');

    const memoryContext = memoryStore.getMemoryPromptContext();
    const instituteName = params.settings?.instituteName || 'Apex NEET & JEE Academy';
    const targetExam = params.settings?.targetExam || params.settings?.defaultTargetExam || 'NEET';
    const structured = isPaperAgent(agent.id);
    const requestedCount = requestedQuestionCount(params.userPrompt);

    const enhancedSystemPrompt = `${agent.systemPrompt}\n\n${memoryContext}\n\nPRODUCTION RULES:\n- Institute: ${instituteName}\n- Default exam: ${targetExam}\n- Never invent or silently drop source questions.\n- Preserve every mathematical symbol, unit, superscript, subscript, Greek letter and scientific notation exactly.\n- For bilingual papers, English and Hindi must be stored separately for every question AND every option.\n- If a question requires a graph/diagram, return a self-contained SVG in diagramSvg; otherwise leave diagramSvg empty.\n${structured ? `- Return ONLY valid JSON matching the requested schema. No markdown fences, no commentary.\n- Questions must be numbered sequentially.\n- For MCQs provide exactly four options A-D and one correctOption.\n- Do not write LaTeX delimiters around ordinary text. Put mathematical expressions as plain LaTeX strings such as \\(E = mc^2\\), \\(V_0\\), \\(\\lambda\\), \\(\\frac{a}{b}\\).` : ''}`;

    addStep('generating', `Generating high-fidelity output via ${params.model || 'Gemini 3.7 Flash'}`);
    const provider = aiRegistry.getProvider('gemini');
    const inlineFiles = (params.attachedFiles || []).filter((f) => !!f.base64Data).map((file) => ({
      mimeType: file.type || 'application/pdf',
      data: (file.base64Data || '').replace(/^data:[^;]+;base64,/, ''),
    }));

    let generatedText = '';
    try {
      generatedText = await provider.generateText(params.userPrompt, {
        systemInstruction: enhancedSystemPrompt,
        model: params.model || 'gemini-3.7-flash',
        temperature: 0.2,
        responseMimeType: structured ? 'application/json' : undefined,
        responseSchema: structured ? PAPER_SCHEMA : undefined,
        inlineFiles: inlineFiles.length ? inlineFiles : undefined,
      });
    } catch (err: any) {
      addStep('failed', `Generation failed: ${err.message}`);
      return this.failedTask(taskId, startTime, params, agent, steps, err.message);
    }

    addStep('checking', 'Performing structural, bilingual, numbering and answer-key verification');

    let parsedDocxData: DocxPaperData;
    try {
      parsedDocxData = structured
        ? this.fromStructuredJson(extractJson(generatedText), instituteName, targetExam, params.userPrompt)
        : { title: params.userPrompt.slice(0, 60), instituteName, examType: targetExam, rawContent: generatedText };
      if (structured) validatePaper(parsedDocxData, params.userPrompt);
    } catch (err: any) {
      addStep('failed', `Quality verification failed: ${err.message}`);
      return this.failedTask(taskId, startTime, params, agent, steps, err.message);
    }

    const artifacts: GeneratedArtifact[] = [];
    try {
      const docxBuffer = await generateDocxBuffer(parsedDocxData);
      artifacts.push({
        id: `art-${Date.now()}-1`,
        name: `${agent.shortCode}_${Date.now()}.docx`,
        fileType: 'docx',
        docxBase64: docxBuffer.toString('base64'),
        size: docxBuffer.length,
        metadata: { title: parsedDocxData.title, questionsCount: parsedDocxData.questions?.length || 0 },
      });
    } catch (err: any) {
      addStep('failed', `DOCX generation failed: ${err.message}`);
      return this.failedTask(taskId, startTime, params, agent, steps, err.message);
    }

    artifacts.push({
      id: `art-${Date.now()}-2`,
      name: `${agent.shortCode}_content.${structured ? 'json' : 'md'}`,
      fileType: structured ? 'json' : 'markdown',
      content: structured ? JSON.stringify(parsedDocxData, null, 2) : generatedText,
      size: Buffer.byteLength(structured ? JSON.stringify(parsedDocxData) : generatedText, 'utf8'),
    });

    addStep('completed', `Task executed successfully. Generated ${artifacts.length} production artifact(s).`);
    const result: ExecutionResult = {
      summary: `Successfully executed by ${agent.name}`,
      rawText: generatedText,
      structuredData: parsedDocxData,
      artifacts,
      agentUsed: { id: agent.id, name: agent.name },
      metrics: { durationMs: Date.now() - startTime },
    };

    return {
      id: taskId,
      title: params.userPrompt.slice(0, 70),
      userPrompt: params.userPrompt,
      agentId: agent.id,
      agentName: agent.name,
      status: 'completed',
      createdAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      steps,
      attachedFiles: params.attachedFiles || [],
      result,
    };
  }

  private static fromStructuredJson(data: any, instituteName: string, targetExam: string, prompt: string): DocxPaperData {
    if (!data || !Array.isArray(data.questions)) throw new Error('Structured output did not contain a questions array.');
    return {
      title: data.title || prompt.slice(0, 60),
      instituteName: data.instituteName || instituteName,
      examType: data.examType || targetExam,
      subject: data.subject || 'All Subjects',
      duration: data.duration || '60 Mins',
      totalMarks: data.totalMarks || data.questions.length * 4,
      instructions: Array.isArray(data.instructions) ? data.instructions : [],
      questions: data.questions.map((q: any, index: number) => ({
        number: q.number || String(index + 1),
        textEn: String(q.textEn || '').trim(),
        textHi: String(q.textHi || '').trim(),
        optionsEn: Array.isArray(q.options) ? q.options.map((o: any) => String(o?.en || '').trim()) : [],
        optionsHi: Array.isArray(q.options) ? q.options.map((o: any) => String(o?.hi || '').trim()) : [],
        correctOption: String(q.correctOption || '').trim().toUpperCase(),
        solution: String(q.solution || '').trim(),
        diagramSvg: typeof q.diagramSvg === 'string' && q.diagramSvg.trim() ? q.diagramSvg.trim() : undefined,
      })),
    };
  }

  private static failedTask(taskId: string, startTime: number, params: ExecuteTaskParams, agent: any, steps: TaskStep[], error: string): TaskRecord {
    return {
      id: taskId,
      title: params.userPrompt.slice(0, 60),
      userPrompt: params.userPrompt,
      agentId: agent.id,
      agentName: agent.name,
      status: 'failed',
      createdAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      steps,
      attachedFiles: params.attachedFiles || [],
      error,
    };
  }
}
