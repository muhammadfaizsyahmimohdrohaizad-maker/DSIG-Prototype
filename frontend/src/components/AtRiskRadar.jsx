import React from 'react';

export const AtRiskRadar = ({ accounts, onSelectAccount, selectedAccountId }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        At-Risk Accounts Radar
      </h2>
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <div
              key={acc.id}
              onClick={() => onSelectAccount(acc.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 flex items-center justify-between ${
                isSelected
                  ? 'bg-slate-800 border-indigo-500 shadow-md'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-sm">
                  {acc.initials}
                </div>
                <div>
                  <p className="font-medium text-slate-100 text-sm">{acc.name}</p>
                  <p className="text-xs text-slate-400">{acc.subtitle_summary}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${
                  acc.health_score < 40 ? 'text-red-400' : acc.health_score < 65 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {acc.health_score}/100
                </span>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{acc.risk_level}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};