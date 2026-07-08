import React from 'react';
import { formatCompact } from '../../utils/formatters';

const SectorBoard = ({ sectorSummary }) => {
  if (!sectorSummary.length) return null;

  return (
    <section className="max-w-7xl mx-auto mb-6 rounded-2xl border border-slate-700 bg-idx-card p-4" aria-label="Sector overview">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-white">Sector Overview</h2>
          <p className="text-xs text-slate-400">Klasifikasi sektor berbasis nama emiten untuk membantu membaca komposisi market.</p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{sectorSummary.length} sectors</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {sectorSummary.slice(0, 4).map((summary) => (
          <div key={summary.sector} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-white">{summary.sector}</div>
                <div className="mt-1 text-xs text-slate-500">{summary.count} tickers - {formatCompact(summary.totalVolume)} volume</div>
              </div>
              <span className={`font-mono text-sm font-bold ${summary.averageChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {summary.averageChange >= 0 ? '+' : ''}{summary.averageChange.toFixed(2)}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.min((summary.gainers / summary.count) * 100, 100)}%` }}></div>
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-500">
              <span>{summary.gainers} gainers</span>
              <span>{summary.losers} losers</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SectorBoard;
