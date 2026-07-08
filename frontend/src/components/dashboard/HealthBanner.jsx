import React from 'react';
import { formatHealthTime } from '../../utils/formatters';

const HealthBanner = ({ health, isLoading, isError, isDebug }) => {
  const isDegraded = isError || health?.status === 'degraded';
  const coverage = health?.cache_coverage_percent ?? 0;
  const unavailableCount = health?.unavailable_tickers_count ?? 0;
  const workerLabel = health?.worker_running ? 'Worker active' : 'Worker warming up';
  const currentTicker = health?.current_ticker?.replace('.JK', '') || 'Idle';
  const batchRange = health?.current_batch_start !== null && health?.current_batch_start !== undefined
    ? `${health.current_batch_start + 1}-${health.current_batch_end}`
    : 'Waiting';

  if (!isDebug) {
    const isUpdating = isLoading || health?.is_updating || health?.worker_running;
    const lastUpdated = health?.last_update_completed_at || health?.last_update_started_at;
    const dataDelayed = isError || isDegraded || unavailableCount > 0 || coverage < 100;
    const statusItems = [
      {
        title: 'Data sedang diperbarui',
        helper: 'Harga diproses otomatis oleh sistem.',
        value: isUpdating ? 'Live refresh' : 'Standby',
        tone: isUpdating ? 'bg-blue-400' : 'bg-slate-500',
      },
      {
        title: 'Terakhir diperbarui',
        helper: 'Mengikuti waktu lokal browser.',
        value: formatHealthTime(lastUpdated),
        tone: 'bg-indigo-400',
      },
      {
        title: dataDelayed ? 'Sebagian data mungkin tertunda' : 'Data tersedia normal',
        helper: 'Beberapa ticker dapat menyusul saat refresh berikutnya.',
        value: dataDelayed ? 'Monitoring' : 'Ready',
        tone: dataDelayed ? 'bg-yellow-400' : 'bg-emerald-400',
      },
      {
        title: isDegraded ? 'Market data delayed' : 'Market data healthy',
        helper: 'Status koneksi data pasar.',
        value: isDegraded ? 'Delayed' : 'Healthy',
        tone: isDegraded ? 'bg-yellow-400' : 'bg-emerald-400',
      },
    ];

    return (
      <section className="max-w-7xl mx-auto mb-6 rounded-3xl border border-slate-700/80 bg-slate-900/70 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur">
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {statusItems.map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-700/80 bg-slate-950/40 p-4 transition-colors hover:border-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${item.tone} ${item.title === 'Data sedang diperbarui' && isUpdating ? 'animate-pulse' : ''}`}></span>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">{item.value}</span>
              </div>
              <div className="mt-3 font-semibold text-white">{item.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-400">{item.helper}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={`max-w-7xl mx-auto mb-6 rounded-2xl border p-4 shadow-lg ${isDegraded ? 'border-yellow-700/60 bg-yellow-950/20' : 'border-slate-700 bg-slate-900/70'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className={`h-2.5 w-2.5 rounded-full ${isDegraded ? 'bg-yellow-400' : 'bg-green-400'} ${isLoading ? 'animate-pulse' : ''}`}></span>
            Backend Data Health
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {isError ? 'Unable to read health endpoint. Check backend connection.' : `${workerLabel}. Last completed: ${formatHealthTime(health?.last_update_completed_at)}.`}
          </p>
          {!isError && health?.last_error && (
            <p className="mt-2 max-w-xl rounded-lg border border-yellow-700/50 bg-yellow-950/30 px-3 py-2 text-xs text-yellow-100">
              Last provider warning: {health.last_error}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 lg:min-w-[560px]">
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-500">Cache Coverage</div>
            <div className="mt-1 text-lg font-bold text-white">{coverage}%</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-idx-accent" style={{ width: `${Math.min(coverage, 100)}%` }}></div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-500">Cached Stocks</div>
            <div className="mt-1 text-lg font-bold text-white">{health?.cached_stocks ?? 0}</div>
            <div className="mt-1 text-slate-500">of {health?.total_stocks ?? 0} tickers</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-500">Unavailable</div>
            <div className={`mt-1 text-lg font-bold ${unavailableCount ? 'text-yellow-300' : 'text-white'}`}>{unavailableCount}</div>
            <div className="mt-1 text-slate-500">retry later</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-500">Current Batch</div>
            <div className="mt-1 text-lg font-bold text-white">{health?.current_batch_size ?? 0}</div>
            <div className="mt-1 text-slate-500">{batchRange} - {currentTicker}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HealthBanner;
