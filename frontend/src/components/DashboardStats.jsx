import React from 'react';

export const DashboardStats = ({ totalMrr, atRiskCount, avgHealthScore }) => {
  const stats = [
    { label: 'Total MRR At Risk', value: `$${totalMrr.toLocaleString()}`, color: 'text-red-400' },
    { label: 'Accounts At Risk', value: atRiskCount, color: 'text-amber-400' },
    { label: 'Avg Portfolio Health', value: `${avgHealthScore}/100`, color: 'text-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
          <h3 className={`text-3xl font-black ${stat.color}`}>{stat.value}</h3>
        </div>
      ))}
    </div>
  );
};