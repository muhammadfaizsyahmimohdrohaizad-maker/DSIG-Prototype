import React from 'react';

export const RateLimiterModal = ({ isOpen, onClose, message, title = "Action Paused" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xl">
            ⚠️
          </div>
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
        </div>
        
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          {message || "We've paused this action to prevent alert fatigue. The contextual downsell threshold has already been reached for this account today."}
        </p>
        
        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};