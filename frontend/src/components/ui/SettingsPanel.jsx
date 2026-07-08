import React from 'react';
import { X } from 'lucide-react';

const SettingsPanel = ({ settings, onChange, onClose }) => (
  <div className="fixed inset-0 z-[70] bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Dashboard settings">
    <div className="ml-auto max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Dashboard Settings</h2>
          <p className="text-sm text-slate-400">Saved locally in this browser.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close settings">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-200">
          <span>Auto refresh</span>
          <input type="checkbox" checked={settings.autoRefresh} onChange={(event) => onChange({ autoRefresh: event.target.checked })} />
        </label>

        <label className="block text-sm text-slate-300">
          <span className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Refresh Interval</span>
          <select value={settings.refreshInterval} onChange={(event) => onChange({ refreshInterval: Number(event.target.value) })} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200">
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>60 seconds</option>
          </select>
        </label>

        <label className="block text-sm text-slate-300">
          <span className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Default Chart Period</span>
          <select value={settings.defaultChartPeriod} onChange={(event) => onChange({ defaultChartPeriod: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200">
            <option value="5d">5D</option>
            <option value="1mo">1M</option>
            <option value="3mo">3M</option>
            <option value="6mo">6M</option>
            <option value="1y">1Y</option>
          </select>
        </label>

        <label className="block text-sm text-slate-300">
          <span className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Default Table Sort</span>
          <select value={settings.defaultTableSort} onChange={(event) => onChange({ defaultTableSort: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200">
            <option value="ticker">Ticker A-Z</option>
            <option value="change-desc">Change tertinggi</option>
            <option value="change-asc">Change terendah</option>
            <option value="volume-desc">Volume terbesar</option>
            <option value="price-desc">Harga tertinggi</option>
          </select>
        </label>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-200">
          <span>Compact mode</span>
          <input type="checkbox" checked={settings.compactMode} onChange={(event) => onChange({ compactMode: event.target.checked })} />
        </label>
      </div>
    </div>
  </div>
);

export default SettingsPanel;
