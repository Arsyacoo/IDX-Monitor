import React from 'react';

const SummaryCard = ({ label, value, helper, icon, tone = 'slate' }) => {
  const IconComponent = icon;
  const toneClass = {
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    slate: 'text-slate-300 bg-slate-800 border-slate-700',
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900 to-slate-950 p-4 shadow-lg shadow-slate-950/20 transition-all hover:-translate-y-0.5 hover:border-slate-600">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <div className="mt-2 text-2xl font-bold text-white">{value}</div>
          <p className="mt-1 text-xs text-slate-400">{helper}</p>
        </div>
        <div className={`rounded-lg border p-2 ${toneClass}`}>
          <IconComponent size={18} />
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
