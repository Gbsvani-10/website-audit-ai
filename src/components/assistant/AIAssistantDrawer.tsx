import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  HelpCircle,
  Code,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import type { AccessibilityIssue, FullScanReport } from '../../types/index.js';
import { apiClient } from '../../utils/apiClient.js';
import { CodeBlock } from '../common/CodeBlock.js';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentScan?: FullScanReport | null;
  selectedIssue?: AccessibilityIssue | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  currentScan,
  selectedIssue,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your **AccessAudit AI Accessibility Specialist**.\n\nI can help you remediate WCAG 2.1 violations, implement accessible React/Tailwind UI patterns, structure keyboard focus traps, and draft compliance documentation.\n\nHow can I help you today?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || input.trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiClient.post<{ reply: string }>('/api/ai/assistant', {
        message: textToSend,
        context: {
          currentUrl: currentScan?.targetUrl,
          selectedIssue: selectedIssue || undefined,
          scores: currentScan?.scores,
        },
      });

      const reply = res.success && res.data?.reply
        ? res.data.reply
        : res.error?.userFriendlyMessage || 'No response from assistant.';

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ ${err.userFriendlyMessage || err.message || 'Error communicating with AI assistant.'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'How do I fix missing button names in React?',
    'Explain WCAG 1.4.3 color contrast rules',
    'Accessible modal dialog keyboard focus trap',
    'How do I handle decorative SVG icons with screen readers?',
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="ai-drawer-title" className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>AccessAudit AI Assistant</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                WCAG 2.1 & Remediation Intelligence
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Selected Context Banner */}
        {selectedIssue && (
          <div className="px-4 py-2 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center justify-between text-xs text-indigo-300">
            <div className="truncate pr-2">
              <span className="font-bold">Active Context:</span> {selectedIssue.ruleId} — {selectedIssue.title}
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 font-mono">
              {selectedIssue.wcagLevel}
            </span>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl p-3.5 leading-relaxed whitespace-pre-line ${
                  msg.sender === 'user'
                    ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                }`}
              >
                {msg.text}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 items-center text-slate-400 text-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              </div>
              <span className="italic">Synthesizing accessibility guidance...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Question Pills */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/30 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Suggested Prompts:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] border border-slate-700/60 transition-all text-left"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about WCAG remediation, React, or CSS..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold transition-all shadow-md active:scale-95"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
};
