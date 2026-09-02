export type AgentCapability = 
  | 'paper_generation'
  | 'bilingual_translation'
  | 'pdf_analysis'
  | 'dpp_creation'
  | 'social_media'
  | 'poster_design'
  | 'reel_script'
  | 'general_assistant'
  | 'custom';

export type TaskStatus = 
  | 'waiting'
  | 'understanding'
  | 'working'
  | 'generating'
  | 'checking'
  | 'completed'
  | 'failed';

export type OutputFileType = 'docx' | 'pdf' | 'txt' | 'json' | 'image' | 'markdown';

export interface AgentDefinition {
  id: string;
  name: string;
  shortCode: string;
  category: 'academic' | 'media' | 'admin' | 'custom';
  description: string;
  capabilities: AgentCapability[];
  inputRequirements: string[];
  outputTypes: OutputFileType[];
  systemPrompt: string;
  enabled: boolean;
  isCustom?: boolean;
  iconName: string;
  samplePrompts: string[];
}

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  base64Data?: string;
  textPreview?: string;
  uploadedAt: string;
}

export interface GeneratedArtifact {
  id: string;
  name: string;
  fileType: OutputFileType;
  downloadUrl?: string;
  content?: string;
  docxBase64?: string;
  size?: number;
  metadata?: Record<string, any>;
}

export interface TaskStep {
  status: TaskStatus;
  label: string;
  timestamp: string;
  details?: string;
}

export interface ExecutionResult {
  summary: string;
  rawText: string;
  structuredData?: any;
  artifacts: GeneratedArtifact[];
  agentUsed: {
    id: string;
    name: string;
  };
  metrics?: {
    durationMs: number;
    tokensEstimated?: number;
  };
}

export interface TaskCheckpoint {
  completedQuestions: number;
  totalQuestions: number;
  nextQuestion: number;
  questions: any[];
}

export interface TaskRecord {
  id: string;
  title: string;
  userPrompt: string;
  agentId: string;
  agentName: string;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
  steps: TaskStep[];
  attachedFiles: AttachedFile[];
  result?: ExecutionResult;
  error?: string;
  checkpoint?: TaskCheckpoint;
}

export interface JarvisMemoryItem {
  id: string;
  category: 'institute' | 'academic_preference' | 'formatting' | 'workflow' | 'custom';
  key: string;
  value: string;
  updatedAt: string;
}

export interface JarvisSettings {
  instituteName: string;
  tagline: string;
  defaultTargetExam: 'NEET' | 'JEE' | 'BOARDS' | 'FOUNDATION';
  primaryLanguage: 'bilingual' | 'english' | 'hindi';
  aiModel: string;
  voiceAutoSpeak: boolean;
  watermarkText: string;
  contactNumber?: string;
  theme: 'dark' | 'midnight' | 'slate';
}
