import React, { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export const LiveChatHandoff = ({ accountId }) => {
  const [input, setInput] = useState('');
  const { messages, escalation, sendMessage } = useWebSocket(accountId);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-[400px]">
      <div className="border-b border-slate-800 pb-3 mb-3 flex items-center justify-between">
        <h4 className="font-semibold text-slate-200 text-sm">Real-time Support & Sentiment Stream</h4>
        {escalation && (
          <span className="bg-red-500/20 text-red-400 text-xs px-2.5 py-1 rounded-full border border-red-500/40 font-bold flex items-center gap-1 animate-bounce">
            🚨 ESCALATED: {escalation.priority_level}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-sm">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2.5 rounded-lg border ${
              msg.should_escalate
                ? 'bg-red-950/40 border-red-800/50 text-slate-200'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <p className="text-xs text-slate-400 font-mono">Score: {msg.sentiment_score}</p>
            <p className="mt-1">{msg.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a support chat message..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          Send
        </button>
      </form>
    </div>
  );
};