import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  HelpCircle,
  Zap,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { JarvisSettings } from '../types';

interface QuickExamBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, agentId: string) => void;
  settings: JarvisSettings;
}

export const QuickExamBuilder: React.FC<QuickExamBuilderProps> = ({
  isOpen,
  onClose,
  onSubmit,
  settings,
}) => {
  const [docType, setDocType] = useState<'neet_paper' | 'jee_paper' | 'dpp'>('neet_paper');
  const [subject, setSubject] = useState('Physics');
  const [chapter, setChapter] = useState('Current Electricity & Magnetism');
  const [questionCount, setQuestionCount] = useState<number>(45);
  const [difficulty, setDifficulty] = useState<'Moderate' | 'Easy' | 'Hard' | 'Mixed NEET Standard'>('Mixed NEET Standard');
  const [language, setLanguage] = useState<'bilingual' | 'english' | 'hindi'>('bilingual');
  const [includeSolutions, setIncludeSolutions] = useState(true);

  if (!isOpen) return null;

  const quickChapters: Record<string, string[]> = {
    Physics: [
      'Current Electricity & Magnetism',
      'Ray & Wave Optics',
      'Rotational Motion & Gravitation',
      'Thermodynamics & Kinetic Theory',
      'Modern Physics & Semiconductor Devices',
      'Electrostatics & Capacitors',
    ],
    Chemistry: [
      'Electrochemistry & Chemical Kinetics',
      'Coordination Compounds & d-Block',
      'Organic: Aldehydes, Ketones & Amines',
      'Chemical Bonding & Periodic Properties',
      'Equilibrium & Thermodynamics',
      'Biomolecules & Polymers',
    ],
    Biology: [
      'Genetics & Principles of Inheritance',
      'Human Physiology (Circulation, Excretion, Neural)',
      'Ecology & Biodiversity Conservation',
      'Cell Structure, Division & Biomolecules',
      'Plant Physiology (Photosynthesis & Respiration)',
      'Biotechnology & its Applications',
    ],
    Mathematics: [
      'Calculus (Definite Integrals & Diff Equations)',
      'Vectors & 3D Geometry',
      'Matrices & Determinants',
      'Coordinate Geometry (Parabola, Ellipse, Hyperbola)',
      'Complex Numbers & Quadratic Equations',
      'Probability & Statistics',
    ],
  };

  const handleGenerate = () => {
    let prompt = '';
    let agentId = 'neet-jee-paper';

    const langStr =
      language === 'bilingual'
        ? 'Hindi-English bilingual format (हिन्दी अनुवाद सहित)'
        : language === 'hindi'
        ? 'Pure Hindi format (हिन्दी माध्यम)'
        : 'English format';

    const solStr = includeSolutions ? 'with complete Answer Key and step-by-step detailed Solutions' : 'with Answer Key table';

    if (docType === 'dpp') {
      agentId = 'dpp-generator';
      prompt = `Create a Daily Practice Problem (DPP) sheet for ${subject}: "${chapter}" containing ${questionCount} ${difficulty} level questions in ${langStr} ${solStr}.`;
    } else if (docType === 'neet_paper') {
      agentId = 'neet-jee-paper';
      prompt = `Generate an authentic NEET examination paper for ${subject}: "${chapter}" with ${questionCount} standard questions in ${langStr} ${solStr}. Preserve all mathematical formulas and 4 options (A), (B), (C), (D).`;
    } else {
      agentId = 'neet-jee-paper';
      prompt = `Generate a standard JEE Main test paper for ${subject}: "${chapter}" with ${questionCount} questions in ${langStr} ${solStr}. Preserve LaTeX equations and 4 options.`;
    }

    onSubmit(prompt, agentId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0c0e1d]/90 p-6 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Quick Question Paper & DPP Creator</h3>
              <p className="text-xs text-slate-400">Configure and generate standard bilingual assessment instantly</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Assessment Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              1. Assessment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'neet_paper', label: 'NEET Question Paper', count: 45 },
                { id: 'jee_paper', label: 'JEE Main Paper', count: 25 },
                { id: 'dpp', label: 'Daily Practice DPP', count: 15 },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setDocType(t.id as any);
                    setQuestionCount(t.count);
                  }}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    docType === t.id
                      ? 'border-cyan-500/50 bg-cyan-500/20 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200 backdrop-blur-md'
                  }`}
                >
                  <div className="text-xs font-bold">{t.label}</div>
                  <div className="text-[10px] text-cyan-300/90 mt-0.5">Standard ~{t.count} Qs</div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              2. Subject
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['Physics', 'Chemistry', 'Biology', 'Mathematics'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSubject(s);
                    if (quickChapters[s]) setChapter(quickChapters[s][0]);
                  }}
                  className={`rounded-xl border py-2 text-center text-xs font-semibold transition-all ${
                    subject === s
                      ? 'border-cyan-500/50 bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white backdrop-blur-md'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Chapter / Topic */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              3. Chapter / Topic Name
            </label>
            <input
              type="text"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="e.g. Current Electricity, Genetics, Organic Chemistry..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 backdrop-blur-md focus:border-cyan-500 focus:outline-none"
            />
            {/* Quick Suggestions */}
            {quickChapters[subject] && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickChapters[subject].map((ch, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setChapter(ch)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 backdrop-blur-md transition-all"
                  >
                    {ch}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Questions Count & Difficulty */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                4. Number of Questions
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-[#0f1225] px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value={5}>5 Questions (Rapid Quiz)</option>
                <option value={10}>10 Questions (Daily DPP)</option>
                <option value={15}>15 Questions (Standard DPP)</option>
                <option value={25}>25 Questions (JEE Section A+B)</option>
                <option value={45}>45 Questions (Full NEET Subject Paper)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                5. Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-[#0f1225] px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="Mixed NEET Standard">Mixed Standard (NEET/JEE Pattern)</option>
                <option value="Moderate">Moderate (Concept Application)</option>
                <option value="Easy">Easy (Foundation / Basic Formula)</option>
                <option value="Hard">Challenger (Multi-Concept / Rank Booster)</option>
              </select>
            </div>
          </div>

          {/* Language Format & Options */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                6. Language Format
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-[#0f1225] px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="bilingual">Bilingual (English + Hindi Side-by-side)</option>
                <option value="english">English Only</option>
                <option value="hindi">Hindi Only (हिन्दी)</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex cursor-pointer items-center space-x-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={includeSolutions}
                  onChange={(e) => setIncludeSolutions(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-cyan-500"
                />
                <span>Include Step-by-Step Solutions & Hints</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end space-x-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center space-x-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate Document with JARVIS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
