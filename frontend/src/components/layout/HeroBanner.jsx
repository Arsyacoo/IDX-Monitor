import React from 'react';
import { Activity, Download, Upload } from 'lucide-react';

const HeroBanner = ({
  settings,
  watchlist,
  showWatchlistOnly,
  onToggleWatchlistMode,
  onImport,
  onExport,
  onClear,
  importInputRef,
}) => (
  <header className="max-w-7xl mx-auto mb-8 overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-6 shadow-2xl shadow-slate-950/30">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
          <Activity size={13} /> IDX Market Intelligence
        </div>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Market Overview</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Pantau saham IDX, trend teknikal, whale activity, dan watchlist target dalam satu dashboard publik yang bersih.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 lg:justify-end">
        <span>
          {settings.autoRefresh
            ? `Auto refresh every ${settings.refreshInterval / 1000} seconds`
            : 'Auto refresh off'}
        </span>
        <button
          type="button"
          onClick={onToggleWatchlistMode}
          className={`rounded-full border px-3 py-1 transition-colors ${showWatchlistOnly ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-300' : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'}`}
        >
          {showWatchlistOnly ? 'Showing Watchlist' : `${watchlist.length} watchlist items`}
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onImport}
        />
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300 hover:text-white"
        >
          <Upload size={12} /> Import
        </button>
        {watchlist.length > 0 && (
          <>
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300 hover:text-white"
            >
              <Download size={12} /> Export
            </button>
            <button
              type="button"
              onClick={onClear}
              className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300 hover:text-white"
            >
              Clear watchlist
            </button>
          </>
        )}
      </div>
    </div>
  </header>
);

export default HeroBanner;
