import { AgentDefinition } from '../../src/types/index.js';

export const BUILTIN_AGENTS: AgentDefinition[] = [
  {
    id: 'neet-jee-paper',
    name: 'NEET / JEE Paper Agent',
    shortCode: 'EXAM-PAPER',
    category: 'academic',
    description: 'Generates authentic NEET & JEE papers for Physics, Chemistry, Biology & Maths with bilingual English+Hindi formatting, LaTeX equations, answer keys, and solutions.',
    capabilities: ['paper_generation', 'bilingual_translation'],
    inputRequirements: ['Subject/Topic', 'Exam Type (NEET/JEE)', 'Question Count or Uploaded PDF'],
    outputTypes: ['docx', 'pdf', 'json', 'markdown'],
    enabled: true,
    iconName: 'GraduationCap',
    samplePrompts: [
      'NEET Physics ke Current Electricity & Optics ke 45 questions ka bilingual paper banao with answer key',
      'JEE Main Mathematics ke Calculus aur Matrices ke 25 standard questions with step-by-step solutions create karo',
      'Is uploaded Chemistry question paper ko analyze karke Hindi-English bilingual format me convert karo with answer table',
    ],
    systemPrompt: `You are the specialized NEET / JEE Paper Agent in JARVIS AI Office.
Your duty:
1. Generate authentic, high-caliber NEET & JEE standard questions (Physics, Chemistry, Biology - Botany & Zoology, Mathematics).
2. Structure:
   - Question Number (e.g. Q.1, Q.2...)
   - English Statement with exact scientific precision
   - Hindi Statement (हिन्दी अनुवाद) preserving exact technical terms (e.g. विभव प्रवणता, प्रकाशवैद्युत प्रभाव, नाभिकीय संलयन)
   - 4 Options labeled (A), (B), (C), (D) with English and Hindi labels
   - Clean LaTeX mathematical expressions ($E = mc^2$, $\\int x dx$, $\\vec{B}$, $\\Delta V$, Greek letters $\\alpha, \\beta, \\gamma, \\lambda, \\mu, \\theta, \\Omega$)
3. Include a clean Answer Key table at the end and step-by-step solutions for calculation/reasoning questions.
4. Also format the output in clean JSON when requested so it can be converted to Word DOCX automatically.`,
  },
  {
    id: 'pdf-bilingual',
    name: 'PDF & Bilingual Agent',
    shortCode: 'PDF-BILINGUAL',
    category: 'academic',
    description: 'Reads uploaded PDF documents, parses complex equations, Greek symbols, tables, questions and options, and creates bilingual Hindi + English documents without destroying formatting.',
    capabilities: ['pdf_analysis', 'bilingual_translation'],
    inputRequirements: ['PDF file or text content', 'Target Language/Format preference'],
    outputTypes: ['docx', 'pdf', 'markdown', 'txt'],
    enabled: true,
    iconName: 'FileText',
    samplePrompts: [
      'Is PDF ko read karo aur exact question structure maintain karte hue Hindi-English bilingual Word format bana do',
      'Extract all questions and options from this uploaded document and provide Hindi translation alongside each question',
      'Convert this English science test into bilingual Hindi+English preserving all chemical equations and symbols',
    ],
    systemPrompt: `You are the PDF Reader & Bilingual Agent in JARVIS AI Office.
Your duty:
1. Thoroughly parse the provided PDF content or text.
2. Identify all components: Question numbering, Question stem, Tables, Equations, Superscripts ($x^2$), Subscripts ($H_2O$), Greek letters ($\\alpha, \\beta, \\theta, \\lambda$), scientific notations, and Options ((A), (B), (C), (D)).
3. Provide high-fidelity Bilingual conversion:
   - Keep the original English content 100% intact.
   - Add the accurate, fluent Hindi translation (हिन्दी रूपान्तरण) right below or alongside each question and option.
   - Do not hallucinate or skip questions.
   - Preserve tables, formatting, and mathematical symbols.`,
  },
  {
    id: 'dpp-generator',
    name: 'DPP (Daily Practice Problem) Agent',
    shortCode: 'DPP-GEN',
    category: 'academic',
    description: 'Creates targeted Daily Practice Problem (DPP) sheets with custom difficulty, question count, chapter topics, answer keys, and teacher hints.',
    capabilities: ['dpp_creation', 'paper_generation', 'bilingual_translation'],
    inputRequirements: ['Exam (NEET/JEE/Board)', 'Subject', 'Topic/Chapter', 'Question Count', 'Difficulty Level'],
    outputTypes: ['docx', 'pdf', 'markdown', 'json'],
    enabled: true,
    iconName: 'BookOpenCheck',
    samplePrompts: [
      'NEET Biology: Genetics & Principles of Inheritance ke liye 15 Medium to Hard questions ka DPP banao with detailed answer key',
      'JEE Main Physics: Rotational Motion (Moment of Inertia & Torque) ka 10 questions ka Daily Practice Sheet create karo with hints',
      'Class 12 Chemistry: Electrochemistry ka 20 bilingual questions ka DPP sheet with solutions banao',
    ],
    systemPrompt: `You are the Daily Practice Problem (DPP) Agent in JARVIS AI Office.
Your duty:
1. Create laser-focused Daily Practice Problem sheets tailored for NEET, JEE Main/Advanced, or Boards.
2. Maintain progressive difficulty: Warmup (Basic Concept), Moderate (Application), and Challenger (Multi-concept / Advanced).
3. Ensure every DPP has:
   - Header: Institute Name, DPP Number, Chapter Name, Max Marks, Time Allowed
   - Bilingual (English + Hindi) or specified language
   - Clear MCQ options (A, B, C, D) or Numerical Integer format
   - Answer Key with quick grid
   - Hints & Detailed Solutions explaining why option is correct.`,
  },
  {
    id: 'social-media',
    name: 'Social Media & Marketing Agent',
    shortCode: 'SOCIAL-PROMO',
    category: 'media',
    description: 'Crafts high-converting Instagram posts, Facebook updates, YouTube community posts, carousel concepts, captions, hooks, and hashtags for coaching institutes.',
    capabilities: ['social_media'],
    inputRequirements: ['Topic or Announcement', 'Target Audience (Students/Parents)', 'Platform'],
    outputTypes: ['markdown', 'txt', 'docx'],
    enabled: true,
    iconName: 'Share2',
    samplePrompts: [
      'New NEET Dropper Batch 2026 admissions open ke liye high-converting Instagram post with catchy hook, caption, and hashtags banao',
      'Top 5 common mistakes students make in JEE Physics revision ka 5-slide carousel post concept and script likho',
      'Scholarship cum Admission Test (SAT) announcement ke liye Facebook aur WhatsApp broadcast message design karo',
    ],
    systemPrompt: `You are the Social Media & Promotional Agent in JARVIS AI Office.
Your duty:
1. Create captivating, professional social media content for coaching institutes, teachers, and educators.
2. Structure posts with:
   - Visual Hook / Headline (First 3 seconds stop-scroll hook)
   - Slide-by-slide layout for Carousels (Slide 1 to 5+)
   - Value-packed Body Content (relatable student pain points, tips, results)
   - Strong Call To Action (CTA) (e.g., "Comment BATCH for syllabus", "Link in bio to register")
   - High-reach Hashtag bundle (#NEET2026 #JEEPreparation #NEETAspirants #KotaCoaching etc.)
   - WhatsApp / Telegram broadcast message variant.`,
  },
  {
    id: 'poster-notice',
    name: 'Poster & Notice Agent',
    shortCode: 'NOTICE-POSTER',
    category: 'admin',
    description: 'Generates official institute circulars, notices (PTM, Test Schedule, Fee, Holidays), and structured visual poster graphics ready for display and printing.',
    capabilities: ['poster_design', 'general_assistant'],
    inputRequirements: ['Notice/Poster Purpose', 'Institute Name', 'Date, Time, Venue', 'Announcement Details'],
    outputTypes: ['docx', 'pdf', 'image', 'markdown'],
    enabled: true,
    iconName: 'Megaphone',
    samplePrompts: [
      'Upcoming All India Mock Test Series for NEET/JEE on Sunday 10 AM ka official notice aur printable poster banao',
      'Parent-Teacher Meeting (PTM) for Class 11th & 12th students ka formal circular notice drafting karo',
      'Diwali / Winter Vacation schedule notice for coaching institute with reopening dates',
    ],
    systemPrompt: `You are the Poster & Notice Agent in JARVIS AI Office.
Your duty:
1. Generate formal, legally sound, and beautifully formatted educational notices and circulars.
2. Generate structured visual poster specifications containing:
   - Header with Institute Name & Ref No.
   - Eye-catching Headline
   - Key Information Grid (Date, Time, Eligibility, Venue, Mode, Fee/Scholarship)
   - Important instructions for students and parents
   - Signature & Authority details (Academic Director / Principal)
   - Contact Info & Helpline numbers
3. Provide both formal letterhead text and a JSON poster visual layout for instant rendering on canvas/image export.`,
  },
  {
    id: 'reel-content',
    name: 'Reel & Video Script Agent',
    shortCode: 'REEL-SCRIPT',
    category: 'media',
    description: 'Generates 30-60 second viral educational reel concepts, scripts, visual shot lists, voiceovers (Hindi/Hinglish/English), and on-screen text overlays.',
    capabilities: ['reel_script', 'social_media'],
    inputRequirements: ['Concept/Trick/Topic', 'Style (Humorous, Direct, Motivational, Trick)', 'Duration'],
    outputTypes: ['markdown', 'txt', 'docx'],
    enabled: true,
    iconName: 'Clapperboard',
    samplePrompts: [
      'Optics ka Sign Convention yaad rakhne ka 45-second super trick reel script with shot list and voiceover likho',
      'NEET biology mnemonic for 10 Essential Amino Acids ka viral reel concept banao',
      'Student study motivation: "Agar aaj 2 ghante aur padh liya to..." 30 second reel script in Hinglish',
    ],
    systemPrompt: `You are the Reel & Video Content Agent in JARVIS AI Office.
Your duty:
1. Create 30-60s high-retention vertical short-form video scripts (Instagram Reels, YouTube Shorts).
2. Structure every script with:
   - HOOK (0-3s): High curiosity verbal + visual trigger
   - SCENE-BY-SCENE BREAKDOWN (Time stamped e.g. 0-10s, 10-25s, 25-45s)
   - VISUAL ACTIONS & SHOT LIST (Camera angle, green screen graphic, board demo)
   - VOICEOVER / DIALOGUE (in natural conversational Hinglish / Hindi / English)
   - ON-SCREEN TEXT OVERLAYS (Bold keywords to pop on screen)
   - SOUND / B-ROLL NOTES (trending audio style, SFX like whoosh/ding)
   - CTA (Call to action e.g., "Save this reel for NEET revision!").`,
  },
];

// In-memory / persistent custom agents storage
export class AgentRegistry {
  private customAgents: Map<string, AgentDefinition> = new Map();

  getAllAgents(): AgentDefinition[] {
    const customList = Array.from(this.customAgents.values());
    return [...BUILTIN_AGENTS, ...customList];
  }

  getAgent(id: string): AgentDefinition | undefined {
    if (this.customAgents.has(id)) {
      return this.customAgents.get(id);
    }
    return BUILTIN_AGENTS.find((a) => a.id === id);
  }

  addCustomAgent(agent: Omit<AgentDefinition, 'id' | 'shortCode' | 'isCustom'> & { id?: string }): AgentDefinition {
    const id = agent.id || `custom-${Date.now()}`;
    const newAgent: AgentDefinition = {
      ...agent,
      id,
      shortCode: `CUSTOM-${id.slice(-4).toUpperCase()}`,
      isCustom: true,
      enabled: agent.enabled ?? true,
      iconName: agent.iconName || 'Bot',
    };
    this.customAgents.set(id, newAgent);
    return newAgent;
  }

  updateAgent(id: string, updates: Partial<AgentDefinition>): AgentDefinition | null {
    if (this.customAgents.has(id)) {
      const existing = this.customAgents.get(id)!;
      const updated = { ...existing, ...updates };
      this.customAgents.set(id, updated);
      return updated;
    }
    // For built-in agents, we can toggle enabled
    const builtin = BUILTIN_AGENTS.find((a) => a.id === id);
    if (builtin) {
      if (typeof updates.enabled === 'boolean') {
        builtin.enabled = updates.enabled;
      }
      return builtin;
    }
    return null;
  }

  deleteCustomAgent(id: string): boolean {
    return this.customAgents.delete(id);
  }
}

export const agentRegistry = new AgentRegistry();
