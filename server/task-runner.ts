import { aiRegistry } from './ai/provider.js';
import { agentRegistry } from './agents/definitions.js';
import { memoryStore } from './memory.js';
import { generateDocxBuffer, DocxPaperData } from './docx-generator.js';
import {
  AttachedFile,
  ExecutionResult,
  GeneratedArtifact,
  TaskRecord,
  TaskStep,
  TaskStatus,
} from '../src/types/index.js';

export interface ExecuteTaskParams {
  userPrompt: string;
  selectedAgentId?: string; // Optional manual override
  attachedFiles?: AttachedFile[];
  model?: string;
  settings?: {
    instituteName?: string;
    targetExam?: string;
    primaryLanguage?: string;
  };
}

export class TaskRunner {
  // Autonomous Agent Routing
  static routeAgent(prompt: string, attachedFiles?: AttachedFile[], manualAgentId?: string): string {
    if (manualAgentId && manualAgentId !== 'auto') {
      const agent = agentRegistry.getAgent(manualAgentId);
      if (agent && agent.enabled) return agent.id;
    }

    const lower = prompt.toLowerCase();
    const hasPdf = attachedFiles?.some((f) => f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf'));

    // Check Poster / Notice keywords first to prevent exam keywords in notices from misrouting
    if (
      lower.includes('notice') ||
      lower.includes('poster') ||
      lower.includes('circular') ||
      lower.includes('ptm') ||
      lower.includes('parent-teacher') ||
      lower.includes('holiday') ||
      lower.includes('vacation') ||
      lower.includes('announcement') ||
      lower.includes('circular notice') ||
      lower.includes('seminar')
    ) {
      return 'poster-notice';
    }

    // Check Reel / Video keywords
    if (
      lower.includes('reel') ||
      lower.includes('short') ||
      lower.includes('video script') ||
      lower.includes('shot list') ||
      lower.includes('voiceover') ||
      lower.includes('60 second') ||
      lower.includes('30 second') ||
      lower.includes('video concept')
    ) {
      return 'reel-content';
    }

    // Check Social media / Marketing keywords
    if (
      lower.includes('instagram') ||
      lower.includes('facebook') ||
      lower.includes('youtube community') ||
      lower.includes('caption') ||
      lower.includes('hashtag') ||
      lower.includes('carousel') ||
      lower.includes('social media') ||
      lower.includes('admission open') ||
      lower.includes('admission announcement') ||
      lower.includes('promo post')
    ) {
      return 'social-media';
    }

    // Check DPP keywords
    if (
      lower.includes('dpp') ||
      lower.includes('daily practice') ||
      lower.includes('practice problem') ||
      lower.includes('homework sheet') ||
      lower.includes('practice sheet')
    ) {
      return 'dpp-generator';
    }

    // If PDF is attached and prompt asks to read/convert/bilingual
    if (hasPdf || lower.includes('pdf') || (lower.includes('read') && attachedFiles && attachedFiles.length > 0)) {
      if (lower.includes('paper') || lower.includes('neet') || lower.includes('jee')) {
        return 'neet-jee-paper';
      }
      return 'pdf-bilingual';
    }

    // Check NEET / JEE Paper keywords
    if (
      lower.includes('neet') ||
      lower.includes('jee') ||
      lower.includes('question paper') ||
      lower.includes('test paper') ||
      lower.includes('exam paper') ||
      lower.includes('questions') ||
      lower.includes('physics') ||
      lower.includes('chemistry') ||
      lower.includes('biology') ||
      lower.includes('botany') ||
      lower.includes('zoology') ||
      lower.includes('maths') ||
      lower.includes('mathematics')
    ) {
      return 'neet-jee-paper';
    }

    // Check custom agents
    const allAgents = agentRegistry.getAllAgents();
    for (const a of allAgents) {
      if (a.isCustom && a.enabled) {
        const matchName = lower.includes(a.name.toLowerCase());
        if (matchName) return a.id;
      }
    }

    // Default fallback
    return 'neet-jee-paper';
  }

  static async execute(params: ExecuteTaskParams): Promise<TaskRecord> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const startTime = Date.now();
    const steps: TaskStep[] = [];

    const addStep = (status: TaskStatus, label: string, details?: string) => {
      steps.push({
        status,
        label,
        timestamp: new Date().toISOString(),
        details,
      });
    };

    addStep('waiting', 'JARVIS Task Initialized');

    // 1. INTENT UNDERSTANDING & AGENT SELECTION
    const selectedAgentId = this.routeAgent(params.userPrompt, params.attachedFiles, params.selectedAgentId);
    const agent = agentRegistry.getAgent(selectedAgentId) || agentRegistry.getAgent('neet-jee-paper')!;

    addStep('understanding', `Intent understood. Routing to specialized agent: ${agent.name}`, `Selected Agent ID: ${agent.id}`);

    // 2. INPUT VALIDATION & MEMORY GROUNDING
    addStep('working', `Validating parameters & grounding with JARVIS Memory`);

    const memoryContext = memoryStore.getMemoryPromptContext();
    const instituteName = params.settings?.instituteName || 'Apex NEET & JEE Academy';
    const targetExam = params.settings?.targetExam || 'NEET';

    // Prepare system instructions with rich grounding
    const enhancedSystemPrompt = `${agent.systemPrompt}

${memoryContext}

ADDITIONAL CONTEXT & CONSTRAINTS:
- Current Target Institute: ${instituteName}
- Default Exam: ${targetExam}
- You must always format content rigorously.
- If producing question papers or DPPs:
  - Write bilingual question stems (English + Hindi)
  - Options (A), (B), (C), (D)
  - Mathematical equations in clear LaTeX ($E=mc^2$, $\\int$, etc.)
  - Provide a clear Answer Key and Detailed Solutions table/section.
- If generating notices or posters:
  - Provide both formatted formal circular text AND a structured poster layout.
- If generating social media/reels:
  - Include Hook, Scene breakdowns, Voiceover in Hinglish/Hindi, and CTAs.`;

    // 3. TASK EXECUTION (AI PROVIDER)
    addStep('generating', `Generating high-fidelity output via ${params.model || 'Gemini 3.7 Flash'}`);

    const provider = aiRegistry.getProvider('gemini');

    // Prepare inline files if PDF/images attached
    const inlineFiles: Array<{ mimeType: string; data: string }> = [];
    if (params.attachedFiles && params.attachedFiles.length > 0) {
      for (const file of params.attachedFiles) {
        if (file.base64Data) {
          // clean base64 data url prefix if present
          const base64Clean = file.base64Data.replace(/^data:[^;]+;base64,/, '');
          inlineFiles.push({
            mimeType: file.type || 'application/pdf',
            data: base64Clean,
          });
        }
      }
    }

    let generatedText = '';
    try {
      generatedText = await provider.generateText(params.userPrompt, {
        systemInstruction: enhancedSystemPrompt,
        model: params.model || 'gemini-3.7-flash',
        temperature: 0.35,
        inlineFiles: inlineFiles.length > 0 ? inlineFiles : undefined,
      });
    } catch (err: any) {
      addStep('failed', `Generation failed: ${err.message}`);
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
        error: err.message,
      };
    }

    // 4. QUALITY CHECK & PARSING
    addStep('checking', `Performing formatting & structural verification`);

    // 5. FILE GENERATION (DOCX + Markdown/Text artifacts)
    const artifacts: GeneratedArtifact[] = [];

    // Extract structured questions if it's a paper or DPP
    const parsedDocxData = this.tryParseToDocxData(generatedText, params.userPrompt, instituteName, targetExam);

    try {
      const docxBuffer = await generateDocxBuffer(parsedDocxData);
      const docxBase64 = docxBuffer.toString('base64');
      const filename = `${agent.shortCode}_${Date.now()}.docx`;

      artifacts.push({
        id: `art-${Date.now()}-1`,
        name: filename,
        fileType: 'docx',
        docxBase64: docxBase64,
        size: docxBuffer.length,
        metadata: {
          title: parsedDocxData.title,
          questionsCount: parsedDocxData.questions?.length || 0,
        },
      });
    } catch (docxErr) {
      console.warn('DOCX generation warning:', docxErr);
    }

    // Text / Markdown Artifact
    artifacts.push({
      id: `art-${Date.now()}-2`,
      name: `${agent.shortCode}_content.md`,
      fileType: 'markdown',
      content: generatedText,
      size: Buffer.byteLength(generatedText, 'utf8'),
    });

    addStep('completed', `Task executed successfully. Generated ${artifacts.length} production artifact(s).`);

    const result: ExecutionResult = {
      summary: `Successfully executed by ${agent.name}`,
      rawText: generatedText,
      structuredData: parsedDocxData,
      artifacts,
      agentUsed: {
        id: agent.id,
        name: agent.name,
      },
      metrics: {
        durationMs: Date.now() - startTime,
      },
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

  private static tryParseToDocxData(
    rawText: string,
    prompt: string,
    instituteName: string,
    targetExam: string
  ): DocxPaperData {
    const questions: DocxPaperData['questions'] = [];

    // Extract any Answer Key Table at the end (e.g. | Q.1 | B | or Q.1: B)
    const answerKeyMap = new Map<string, string>();
    const tableRowMatches = rawText.matchAll(/\|\s*(?:\*\*)?(?:Q\.?\s*|Question\s*)?(\d+)(?:\*\*)?\s*\|\s*(?:\*\*)?(?:\()?([A-D]|[1-4])(?:\))?(?:\*\*)?\s*\|/gi);
    for (const match of tableRowMatches) {
      answerKeyMap.set(match[1], match[2].toUpperCase());
    }

    // Match question blocks: e.g. Q.1, Q1., Question 1, 1., **Q.1**, **1.**
    const qBlocks = rawText.split(/(?=(?:\*\*|\#\#\s*)?(?:Q\.?\s*\d+|Question\s+\d+|\b\d+\.)\b)/i);

    for (const block of qBlocks) {
      const matchQ = block.match(/(?:\*\*|\#\#\s*)?(?:Q\.?\s*|Question\s+|)(\d+)[:.\s\*\)]+([\s\S]*)/i);
      if (matchQ) {
        const qNum = matchQ[1];
        let remaining = matchQ[2];

        // Extract Hindi translation if separated by (हिन्दी), [Hindi], or (Hindi) or **(हिन्दी)**
        let textEn = remaining;
        let textHi = '';

        const hindiSplit = remaining.split(/(?:\(\*?\*?हिन्दी\*?\*?\)|\[\*?\*?हिन्दी\*?\*?\]|\*?\*?हिन्दी\*?\*?:|\*?\*?Hindi\*?\*?:)/i);
        if (hindiSplit.length > 1) {
          textEn = hindiSplit[0];
          textHi = hindiSplit[1];
        }

        // Extract Options (A), (B), (C), (D) or (1), (2), (3), (4) with possible bold asterisks
        const optionsEn: string[] = [];
        const optMatches = remaining.matchAll(/(?:\*\*)?(?:\((?:[A-D]|[1-4])\)|(?:[A-D]|[1-4])\))(?:\*\*)?\s*([^\n\(\)]+)/g);
        for (const opt of optMatches) {
          const optText = opt[1].replace(/\*\*/g, '').trim();
          if (optText.length > 0 && !optionsEn.includes(optText)) {
            optionsEn.push(optText);
          }
        }

        // Extract Answer Key / Solution if in block or from global map
        let correctOption = answerKeyMap.get(qNum) || '';
        if (!correctOption) {
          const ansMatch = block.match(/(?:Answer|Ans|Correct Option)[:\s\*]+(?:\()?([A-D]|[1-4])(?:\))?/i);
          if (ansMatch) {
            correctOption = ansMatch[1].toUpperCase();
          }
        }

        let solution = '';
        const solMatch = block.match(/(?:Solution|Explanation|विस्तृत हल)[:\s\*]+([\s\S]+?)(?=\n\n|\nQ|\n\d+\.|\n\*\*Q|\n\#\#|$)/i);
        if (solMatch) {
          solution = solMatch[1].replace(/\*\*/g, '').trim();
        }

        // Clean question text (remove options from textEn)
        textEn = textEn.split(/(?:\(\*?\*?[A-D]\*?\*?\)|\(\*?\*?[1-4]\*?\*?\)|Option [A-D])/i)[0]
          .replace(/\*\*/g, '')
          .replace(/^\s*[:.\-]\s*/, '')
          .trim();

        if (textHi) {
          textHi = textHi.split(/(?:\(\*?\*?[A-D]\*?\*?\)|\(\*?\*?[1-4]\*?\*?\)|Option [A-D])/i)[0]
            .replace(/\*\*/g, '')
            .replace(/^\s*[:.\-]\s*/, '')
            .trim();
        }

        if (textEn.length > 5 && !textEn.toLowerCase().startsWith('table') && !textEn.toLowerCase().startsWith('answer key')) {
          questions.push({
            number: qNum,
            textEn,
            textHi: textHi || undefined,
            optionsEn: optionsEn.length > 0 ? optionsEn.slice(0, 4) : undefined,
            correctOption: correctOption || undefined,
            solution: solution || undefined,
          });
        }
      }
    }

    return {
      title: prompt.slice(0, 60),
      instituteName,
      examType: targetExam,
      subject: 'Academic Assessment',
      questions: questions.length > 0 ? questions : undefined,
      rawContent: rawText,
    };
  }
}
