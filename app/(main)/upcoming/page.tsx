'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, Sparkles, Loader2, X, ChevronRight, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const UPCOMING_MEETING = {
  title: 'Fireflies AI — Future Scope Discussion',
  date: '2026-06-03T10:00:00Z',
  description: 'Discuss the future roadmap, potential features, and strategic direction of Fireflies.ai',
};

const INITIAL_PROMPT = 'Generate talking points for this upcoming meeting based on my past meetings. Group them into logical sections.';

export default function UpcomingPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage(content: string) {
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to get response');
      }
      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.content }]);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Something went wrong';
      setMessages([...newMessages, { role: 'assistant', content: `**Error:** ${errorMsg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function openChat() {
    setPanelOpen(true);
    if (messages.length === 0) {
      sendMessage(INITIAL_PROMPT);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    sendMessage(trimmed);
  }

  const meetingDate = new Date(UPCOMING_MEETING.date);
  const formattedDate = meetingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = meetingDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-auto">
        <div
          className="relative overflow-hidden px-8 py-14 flex flex-col items-center text-center"
          style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 30%, #bbf7d0 60%, #86efac 100%)' }}
        >
          <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #4ade80, transparent)' }} />
          <div className="absolute -bottom-10 -right-10 w-80 h-80 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #16a34a, transparent)' }} />
          <div className="relative z-10">
            <p className="text-sm font-medium text-green-600 mb-2 tracking-wide uppercase">Upcoming</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Prepare for What&apos;s Next</h1>
            <p className="text-gray-500 text-base max-w-md">
              Click a meeting to chat with AI about your past conversations and get prepared.
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-8"
            style={{ background: 'linear-gradient(to bottom, transparent, #f9fafb)' }} />
        </div>

        <div className="px-8 py-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Scheduled Meetings</h2>

          <button
            onClick={openChat}
            className="w-full text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-green-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                  {UPCOMING_MEETING.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{UPCOMING_MEETING.description}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    {formattedDate}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {formattedTime}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-green-500 transition-colors shrink-0 ml-4" />
            </div>
          </button>
        </div>
      </div>

      {/* RHS Chat Panel */}
      {panelOpen && (
        <div className="w-[420px] shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col h-full">
          {/* Panel header */}
          <div className="px-5 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-green-600" />
              <h3 className="text-sm font-semibold text-gray-900">Meeting Prep Chat</h3>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div className="max-w-[85%] bg-green-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-md">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[95%] bg-white border border-gray-200 text-sm px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                    <div className="prose prose-sm prose-gray max-w-none
                      prose-headings:text-gray-900 prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                      prose-p:text-gray-600 prose-p:leading-relaxed prose-p:my-1
                      prose-li:text-gray-600 prose-li:leading-relaxed prose-li:my-0.5
                      prose-strong:text-gray-900 prose-strong:font-semibold
                      prose-ul:my-2 prose-ol:my-2
                      first:prose-headings:mt-0
                    ">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 text-sm px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Thinking…</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-200 bg-white">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about past meetings…"
                disabled={loading}
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
