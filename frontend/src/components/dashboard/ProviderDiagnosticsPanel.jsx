import React from 'react';
import { formatHealthTime } from '../../utils/formatters';

const ProviderDiagnosticsPanel = ({ diagnostics, isLoading, isError }) => {
  const providers = diagnostics?.providers || [];
  const unavailableTickers = diagnostics?.unavailable_tickers || [];

  return (
    <section className="max-w-7xl mx-auto mb-6 rounded-xl border border-slate-700 bg-idx-card p-4" aria-label="Provider diagnostics">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-white">Data Diagnostics</h2>
          <p className="text-xs text-slate-400">Provider success/failure counters and temporarily skipped tickers.</p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          {isLoading ? 'Loading...' : `${diagnostics?.total_unavailable ?? 0} unavailable`}
        </span>
      </div>

      {isError ? (
        <div className="rounded-lg border border-yellow-700/50 bg-yellow-950/20 p-3 text-sm text-yellow-100">
          Unable to load provider diagnostics.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {providers.map((provider) => (
            <div key={provider.key} className="rounded-lg border border-slate-700 bg-slate-800/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{provider.name}</div>
                  <div className="mt-1 text-xs text-slate-500">Last success: {formatHealthTime(provider.last_success_at)}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${provider.status === 'ok' ? 'bg-emerald-500/10 text-emerald-300' : provider.status === 'degraded' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-slate-700 text-slate-300'}`}>
                  {provider.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-slate-900 p-2">
                  <div className="text-slate-500">Success</div>
                  <div className="mt-1 font-mono text-slate-100">{provider.success_count}</div>
                </div>
                <div className="rounded-md bg-slate-900 p-2">
                  <div className="text-slate-500">Failure</div>
                  <div className="mt-1 font-mono text-slate-100">{provider.failure_count}</div>
                </div>
              </div>
              {provider.last_error && <div className="mt-3 rounded-md border border-yellow-700/50 bg-yellow-950/20 p-2 text-xs text-yellow-100">{provider.last_error}</div>}
            </div>
          ))}

          <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3 lg:col-span-1">
            <div className="font-semibold text-white">Skipped Tickers</div>
            <div className="mt-3 max-h-32 space-y-2 overflow-auto text-xs">
              {unavailableTickers.length ? unavailableTickers.slice(0, 8).map((item) => (
                <div key={item.ticker} className="rounded-md bg-slate-900 p-2">
                  <div className="font-mono text-slate-100">{item.ticker}</div>
                  <div className="mt-1 text-slate-500">Retry after {formatHealthTime(item.retry_after)}</div>
                </div>
              )) : <div className="text-slate-500">No tickers are currently skipped.</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProviderDiagnosticsPanel;
