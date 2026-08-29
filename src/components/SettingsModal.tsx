import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Cpu,
  Globe,
  Sliders,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { JarvisSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: JarvisSettings;
  onSaveSettings: (newSettings: JarvisSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<JarvisSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0c0e1d]/90 p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">JARVIS AI Office Settings</h3>
              <p className="text-xs text-slate-400">Institutional profiles & AI provider configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Institute Profile */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 backdrop-blur-md">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Institute Branding</span>
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-300">
                Institute / Academy Name
              </label>
              <input
                type="text"
                value={formData.instituteName}
                onChange={(e) => setFormData({ ...formData, instituteName: e.target.value })}
                placeholder="e.g. Apex NEET & JEE Academy"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 backdrop-blur-md focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">
                Tagline / Slogan
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. Transforming Aspirations into Ranks"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 backdrop-blur-md focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">
                Helpline / Contact Info (For Notices & Posters)
              </label>
              <input
                type="text"
                value={formData.contactNumber || ''}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                placeholder="e.g. +91 98765 43210 | info@apex.edu"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 backdrop-blur-md focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* AI & Academic Defaults */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 backdrop-blur-md">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
              <Cpu className="h-4 w-4" />
              <span>AI Provider & Academic Defaults</span>
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  AI Model
                </label>
                <select
                  value={formData.aiModel}
                  onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f1225] px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (Recommended)</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Default Target Exam
                </label>
                <select
                  value={formData.defaultTargetExam}
                  onChange={(e) => setFormData({ ...formData, defaultTargetExam: e.target.value as any })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f1225] px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="NEET">NEET UG</option>
                  <option value="JEE">JEE Main & Advanced</option>
                  <option value="BOARDS">Class 12 Boards</option>
                  <option value="FOUNDATION">Foundation (9th-10th)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">
                Default Output Language
              </label>
              <select
                value={formData.primaryLanguage}
                onChange={(e) => setFormData({ ...formData, primaryLanguage: e.target.value as any })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f1225] px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="bilingual">Bilingual (English + Hindi Side-by-side)</option>
                <option value="english">English Only</option>
                <option value="hindi">Hindi Only (हिन्दी)</option>
              </select>
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-center space-x-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Server-side security active. API credentials are safely injected at runtime on the server and never exposed to the client.
            </span>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
            >
              {saved ? <Check className="h-4 w-4" /> : null}
              <span>{saved ? 'Saved!' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
