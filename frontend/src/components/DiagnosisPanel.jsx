import React from 'react';

export const DiagnosisPanel = ({ diagnostics, loading }) => {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400 animate-pulse">
        Loading SHAP XAI Diagnostics...
      </div>
    );
  }

  if (!diagnostics) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-500">
        Select an account from the radar to inspect feature impact breakdown.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-100">{diagnostics.account_name}</h3>
          <p className="text-xs text-slate-400">Explainable AI (SHAP) Churn Diagnostics</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-indigo-400">{diagnostics.health_score}</span>
          <p className="text-[10px] text-slate-500 uppercase">Health Score</p>
        </div>
      </div>

      <div className="space-y-4">
        {diagnostics.shap_features.map((feature, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">{feature.feature_name}</span>
              <span className={feature.is_risk_factor ? 'text-red-400' : 'text-emerald-400'}>
                {feature.shap_value > 0 ? `+${feature.shap_value}` : feature.shap_value}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  feature.is_risk_factor ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${feature.percentage_weight}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};