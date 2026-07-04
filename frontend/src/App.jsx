import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, keepPreviousData } from '@tanstack/react-query';
import StockTable from './components/StockTable';
import { fetchHealth, fetchMarketSummary, fetchProviderDiagnostics, fetchStocks } from './api';
import { Activity, BarChart3, Download, LayoutDashboard, Radar, Clock, RefreshCw, Settings, TrendingDown, TrendingUp, Upload, X } from 'lucide-react';

const StockChart = lazy(() => import('./components/StockChart'));
const WhaleAlerts = lazy(() => import('./components/WhaleAlerts'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
const WATCHLIST_STORAGE_KEY = 'idx-monitor-watchlist';
const SETTINGS_STORAGE_KEY = 'idx-monitor-settings';
const DEFAULT_SETTINGS = {
  autoRefresh: true,
  refreshInterval: 10000,
  defaultChartPeriod: '1mo',
  defaultTableSort: 'ticker',
  compactMode: false,
};

const PanelFallback = ({ label }) => (
  <div className="bg-idx-card rounded-xl border border-slate-700 h-full flex items-center justify-center text-slate-400">
    <div className="animate-pulse">Loading {label}...</div>
  </div>
);

const formatCompact = (value) => new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(value || 0);

const formatHealthTime = (value) => {
  if (!value) return 'Not yet';
  return new Date(value).toLocaleTimeString('id-ID');
};

const normalizeWatchlistItem = (item) => {
  if (typeof item === 'string') {
    return {
      ticker: item.trim().toUpperCase(),
      note: '',
      targetPrice: '',
      alertThreshold: 5,
      lots: '',
      averagePrice: '',
    };
  }

  return {
    ticker: String(item?.ticker || '').trim().toUpperCase(),
    note: String(item?.note || ''),
    targetPrice: item?.targetPrice ?? '',
    alertThreshold: Number(item?.alertThreshold ?? 5),
    lots: item?.lots ?? '',
    averagePrice: item?.averagePrice ?? '',
  };
};

const normalizeWatchlist = (items) => {
  if (!Array.isArray(items)) return [];
  const normalizedItems = items.map(normalizeWatchlistItem).filter((item) => item.ticker);
  return [...new Map(normalizedItems.map((item) => [item.ticker, item])).values()];
};

const getTargetStatus = (stock, item) => {
  const targetPrice = Number(item.targetPrice);
  if (!stock || !targetPrice) return null;

  const distancePercent = ((targetPrice - stock.last_price) / stock.last_price) * 100;
  const threshold = Number(item.alertThreshold || 5);
  const isNearTarget = Math.abs(distancePercent) <= threshold;

  return {
    distancePercent,
    isNearTarget,
    label: isNearTarget ? 'Near target' : `${distancePercent > 0 ? '+' : ''}${distancePercent.toFixed(1)}% to target`,
  };
};

const getPortfolioPosition = (stock, item) => {
  const lots = Number(item.lots || 0);
  const averagePrice = Number(item.averagePrice || 0);
  const lastPrice = Number(stock?.last_price || 0);
  if (!lots || !averagePrice || !lastPrice) return null;

  const shares = lots * 100;
  const investedValue = shares * averagePrice;
  const marketValue = shares * lastPrice;
  const unrealizedPnL = marketValue - investedValue;
  const unrealizedPnLPercent = investedValue ? (unrealizedPnL / investedValue) * 100 : 0;

  return {
    lots,
    averagePrice,
    shares,
    investedValue,
    marketValue,
    unrealizedPnL,
    unrealizedPnLPercent,
  };
};

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

const ToastStack = ({ toasts, onDismiss }) => (
  <div className="fixed right-4 top-20 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
    {toasts.map((toast) => (
      <div key={toast.id} className={`rounded-xl border p-4 shadow-xl backdrop-blur ${toast.type === 'error' ? 'border-red-700 bg-red-950/90 text-red-100' : 'border-slate-700 bg-slate-900/90 text-slate-100'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{toast.title}</div>
            {toast.message && <div className="mt-1 text-sm text-slate-300">{toast.message}</div>}
          </div>
          <button type="button" onClick={() => onDismiss(toast.id)} className="text-slate-400 hover:text-white" aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      </div>
    ))}
  </div>
);

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

const WatchlistBoard = ({ stocks, watchlist, onOpenTicker, onUpdateWatchlistItem }) => {
  if (watchlist.length === 0) return null;

  const enrichedWatchlist = watchlist.map((item) => {
    const stock = stocks.find((stockItem) => stockItem.ticker === item.ticker);
    const targetStatus = getTargetStatus(stock, item);
    const portfolioPosition = getPortfolioPosition(stock, item);
    return { item, stock, targetStatus, portfolioPosition };
  }).sort((firstItem, secondItem) => {
    if (firstItem.targetStatus?.isNearTarget && !secondItem.targetStatus?.isNearTarget) return -1;
    if (!firstItem.targetStatus?.isNearTarget && secondItem.targetStatus?.isNearTarget) return 1;
    return Math.abs(firstItem.targetStatus?.distancePercent ?? 999) - Math.abs(secondItem.targetStatus?.distancePercent ?? 999);
  });

  return (
    <section className="max-w-7xl mx-auto mb-6 rounded-xl border border-slate-700 bg-idx-card p-4" aria-label="Watchlist board">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-white">Watchlist Board</h2>
          <p className="text-xs text-slate-400">Quick access, notes, target prices, and alert thresholds.</p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{watchlist.length} saved</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {enrichedWatchlist.slice(0, 8).map(({ item, stock, targetStatus, portfolioPosition }) => {
          return (
            <div key={item.ticker} className={`rounded-lg border bg-slate-800/70 p-3 transition-colors ${targetStatus?.isNearTarget ? 'border-yellow-500/70' : 'border-slate-700'}`}>
              <button type="button" onClick={() => onOpenTicker(item.ticker)} className="w-full text-left focus:outline-none focus:ring-2 focus:ring-idx-accent rounded-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-white">{item.ticker}</div>
                    <div className="mt-1 truncate text-xs text-slate-400">{stock?.name || 'Open ticker chart'}</div>
                  </div>
                  {targetStatus?.isNearTarget && <span className="rounded-full border border-yellow-500/50 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-300">Alert</span>}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-mono text-slate-200">{stock ? formatCompact(stock.last_price) : '-'}</span>
                  <span className={stock?.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}>{stock ? `${stock.change_percent}%` : 'Open'}</span>
                </div>
              </button>
              <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
                <input
                  type="text"
                  value={item.note}
                  onChange={(event) => onUpdateWatchlistItem(item.ticker, { note: event.target.value })}
                  placeholder="Add note..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={item.targetPrice}
                    onChange={(event) => onUpdateWatchlistItem(item.ticker, { targetPrice: event.target.value })}
                    placeholder="Target price"
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500"
                  />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={item.alertThreshold}
                    onChange={(event) => onUpdateWatchlistItem(item.ticker, { alertThreshold: event.target.value })}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
                    aria-label={`${item.ticker} alert threshold percentage`}
                  />
                </div>
                <div className={`text-xs ${targetStatus?.isNearTarget ? 'text-yellow-300' : 'text-slate-500'}`}>
                  {targetStatus ? targetStatus.label : 'Set target price to enable alert'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={item.lots}
                    onChange={(event) => onUpdateWatchlistItem(item.ticker, { lots: event.target.value })}
                    placeholder="Lots"
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500"
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.averagePrice}
                    onChange={(event) => onUpdateWatchlistItem(item.ticker, { averagePrice: event.target.value })}
                    placeholder="Avg price"
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                {portfolioPosition ? (
                  <div className="rounded-md border border-slate-700 bg-slate-900 p-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Market value</span>
                      <span className="font-mono text-slate-200">{formatCompact(portfolioPosition.marketValue)}</span>
                    </div>
                    <div className={`mt-1 flex justify-between font-semibold ${portfolioPosition.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      <span>Unrealized P/L</span>
                      <span>{portfolioPosition.unrealizedPnL >= 0 ? '+' : ''}{formatCompact(portfolioPosition.unrealizedPnL)} ({portfolioPosition.unrealizedPnLPercent.toFixed(2)}%)</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Isi lots dan avg price untuk aktifkan portfolio P/L.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

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

function Dashboard() {
  const [toasts, setToasts] = useState([]);
  const isDebugMode = useMemo(() => new URLSearchParams(window.location.search).get('debug') === 'true', []);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTicker, setSelectedTicker] = useState('BBCA');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const importInputRef = useRef(null);
  const [watchlist, setWatchlist] = useState(() => {
    try {
      return normalizeWatchlist(JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY)) || []);
    } catch {
      return [];
    }
  });

  const { data: stockData, isLoading, isFetching, error, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['stocks', page, search],
    queryFn: () => fetchStocks({ page, limit: 10, search }),
    refetchInterval: settings.autoRefresh ? settings.refreshInterval : false,
    placeholderData: keepPreviousData,
    enabled: currentView === 'dashboard',
  });
  const { data: marketSummaryData } = useQuery({
    queryKey: ['marketSummary'],
    queryFn: fetchMarketSummary,
    refetchInterval: settings.autoRefresh ? settings.refreshInterval : false,
    enabled: currentView === 'dashboard',
  });
  const { data: healthData, isLoading: isHealthLoading, isError: isHealthError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: settings.autoRefresh ? settings.refreshInterval : false,
    enabled: currentView === 'dashboard',
  });
  const { data: providerDiagnostics, isLoading: isProviderDiagnosticsLoading, isError: isProviderDiagnosticsError } = useQuery({
    queryKey: ['providerDiagnostics'],
    queryFn: fetchProviderDiagnostics,
    refetchInterval: settings.autoRefresh ? settings.refreshInterval : false,
    enabled: currentView === 'dashboard' && isDebugMode,
  });

  const addToast = useCallback((toast) => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setToasts((currentToasts) => [...currentToasts, { id, type: 'success', ...toast }]);
    setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((nextSettings) => {
    setSettings((currentSettings) => ({ ...currentSettings, ...nextSettings }));
  }, []);

  useEffect(() => {
    if (error) {
      addToast({ type: 'error', title: 'Market data unavailable', message: 'Backend may be offline or still warming up.' });
    }
  }, [addToast, error]);

  const toggleWatchlist = useCallback((ticker) => {
    setWatchlist((currentWatchlist) => {
      const exists = currentWatchlist.some((item) => item.ticker === ticker);
      if (exists) return currentWatchlist.filter((item) => item.ticker !== ticker);
      return [...currentWatchlist, normalizeWatchlistItem(ticker)];
    });
  }, []);

  const updateWatchlistItem = useCallback((ticker, patch) => {
    setWatchlist((currentWatchlist) => currentWatchlist.map((item) => (
      item.ticker === ticker ? normalizeWatchlistItem({ ...item, ...patch }) : item
    )));
  }, []);

  const clearWatchlist = () => {
    setWatchlist([]);
    setShowWatchlistOnly(false);
    addToast({ title: 'Watchlist cleared', message: 'All saved tickers were removed.' });
  };

  const exportWatchlist = () => {
    const payload = {
      app: 'IDX Monitor',
      exported_at: new Date().toISOString(),
      version: 2,
      watchlist,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'idx-monitor-watchlist.json';
    link.click();
    URL.revokeObjectURL(url);
    addToast({ title: 'Watchlist exported', message: `${watchlist.length} tickers saved to JSON.` });
  };

  const importWatchlist = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const importedWatchlist = Array.isArray(parsed) ? parsed : parsed.watchlist;
        const normalizedWatchlist = normalizeWatchlist(importedWatchlist);
        if (!normalizedWatchlist.length) return;

        setWatchlist(normalizedWatchlist);
        setShowWatchlistOnly(normalizedWatchlist.length > 0);
        addToast({ title: 'Watchlist imported', message: `${normalizedWatchlist.length} tickers loaded.` });
      } catch {
        addToast({ type: 'error', title: 'Import failed', message: 'Please select a valid watchlist JSON file.' });
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const stocks = useMemo(() => stockData?.data || [], [stockData]);
  const watchlistTickers = useMemo(() => watchlist.map((item) => item.ticker), [watchlist]);
  const watchlistByTicker = useMemo(() => new Map(watchlist.map((item) => [item.ticker, item])), [watchlist]);
  const stocksWithWatchlistStatus = useMemo(() => stocks.map((stock) => {
    const watchlistItem = watchlistByTicker.get(stock.ticker);
    return {
      ...stock,
      sector: stock.sector || 'Other',
      sectorSource: stock.sector_source || 'unknown',
      watchlistTargetStatus: watchlistItem ? getTargetStatus(stock, watchlistItem) : null,
      portfolioPosition: watchlistItem ? getPortfolioPosition(stock, watchlistItem) : null,
    };
  }), [stocks, watchlistByTicker]);
  const nearTargetCount = useMemo(() => stocksWithWatchlistStatus.filter((stock) => stock.watchlistTargetStatus?.isNearTarget).length, [stocksWithWatchlistStatus]);
  const portfolioSummary = useMemo(() => {
    const positions = stocksWithWatchlistStatus.map((stock) => stock.portfolioPosition).filter(Boolean);
    const investedValue = positions.reduce((total, position) => total + position.investedValue, 0);
    const marketValue = positions.reduce((total, position) => total + position.marketValue, 0);
    const unrealizedPnL = marketValue - investedValue;
    const unrealizedPnLPercent = investedValue ? (unrealizedPnL / investedValue) * 100 : 0;

    return {
      positions: positions.length,
      investedValue,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPercent,
    };
  }, [stocksWithWatchlistStatus]);
  const sectorSummary = useMemo(() => {
    const summaryBySector = stocksWithWatchlistStatus.reduce((summary, stock) => {
      const currentSector = stock.sector || 'Other';
      const currentSummary = summary[currentSector] || {
        sector: currentSector,
        count: 0,
        gainers: 0,
        losers: 0,
        totalChange: 0,
        totalVolume: 0,
      };
      currentSummary.count += 1;
      currentSummary.gainers += stock.change_percent > 0 ? 1 : 0;
      currentSummary.losers += stock.change_percent < 0 ? 1 : 0;
      currentSummary.totalChange += stock.change_percent || 0;
      currentSummary.totalVolume += stock.volume || 0;
      summary[currentSector] = currentSummary;
      return summary;
    }, {});

    return Object.values(summaryBySector)
      .map((summary) => ({
        ...summary,
        averageChange: summary.count ? summary.totalChange / summary.count : 0,
      }))
      .sort((firstSummary, secondSummary) => secondSummary.totalVolume - firstSummary.totalVolume);
  }, [stocksWithWatchlistStatus]);
  const leadingSector = sectorSummary[0] || { sector: '-', count: 0, averageChange: 0 };
  const totalPages = stockData?.total_pages || 1;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID') : '-';
  const visibleStocks = useMemo(() => (
    showWatchlistOnly ? stocksWithWatchlistStatus.filter((stock) => watchlistTickers.includes(stock.ticker)) : stocksWithWatchlistStatus
  ), [showWatchlistOnly, stocksWithWatchlistStatus, watchlistTickers]);
  const marketSummary = useMemo(() => {
    const pageGainers = stocks.filter((stock) => stock.change_percent > 0).length;
    const pageLosers = stocks.filter((stock) => stock.change_percent < 0).length;
    const pageUnchanged = stocks.filter((stock) => stock.change_percent === 0).length;
    const pageTopVolume = stocks.reduce((highest, stock) => (
      (stock.volume || 0) > (highest.volume || 0) ? stock : highest
    ), { ticker: '-', volume: 0 });

    return {
      loaded: marketSummaryData?.total_cached ?? stocks.length,
      gainers: marketSummaryData?.gainers ?? pageGainers,
      losers: marketSummaryData?.losers ?? pageLosers,
      unchanged: marketSummaryData?.unchanged ?? pageUnchanged,
      topVolume: marketSummaryData?.top_volume?.[0] ?? pageTopVolume,
      isMarketWide: Boolean(marketSummaryData),
    };
  }, [marketSummaryData, stocks]);

  const openTickerFromAlert = useCallback((ticker) => {
    setSelectedTicker(ticker);
    setCurrentView('dashboard');
    setSearch(ticker);
    setPage(1);
  }, []);

  const toggleWatchlistMode = () => {
    const nextValue = !showWatchlistOnly;
    setShowWatchlistOnly(nextValue);

    if (!nextValue) return;

    const firstWatchlistStock = stocks.find((stock) => watchlistTickers.includes(stock.ticker));
    if (firstWatchlistStock && !watchlistTickers.includes(selectedTicker)) {
      setSelectedTicker(firstWatchlistStock.ticker);
    }
  };

  return (
    <div className={`min-h-screen bg-idx-dark text-idx-text font-sans flex flex-col ${settings.compactMode ? 'text-sm' : ''}`}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {isSettingsOpen && <SettingsPanel settings={settings} onChange={updateSettings} onClose={() => setIsSettingsOpen(false)} />}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="font-bold text-xl bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              IDX Monitor
            </div>
            <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'dashboard' ? 'bg-idx-card text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                <LayoutDashboard size={16} /> Market Data
              </button>
              <button
                onClick={() => setCurrentView('whales')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'whales' ? 'bg-idx-card text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                <Radar size={16} /> Whale Alerts
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentView === 'dashboard' && (
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="hidden sm:flex text-xs text-slate-300 items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 hover:text-white"
                aria-label="Open dashboard settings"
              >
                <Settings size={13} /> Settings
              </button>
            )}
            {currentView === 'dashboard' && (
              <button
                type="button"
                onClick={() => {
                  refetch();
                  addToast({ title: 'Refreshing market data', message: 'Fetching the latest cached prices.' });
                }}
                className="hidden sm:flex text-xs text-slate-300 items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 hover:text-white"
              >
                <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
              </button>
            )}
            {currentView === 'dashboard' && (
              <div className="hidden sm:flex text-xs text-slate-400 items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                <Clock size={13} /> Updated {lastUpdated}
              </div>
            )}
            <div className="text-xs text-green-400 flex items-center gap-1.5 bg-green-900/20 px-3 py-1 rounded-full border border-green-800/30">
              <div className={`w-1.5 h-1.5 rounded-full bg-green-500 ${isFetching ? 'animate-pulse' : ''}`}></div>
              {isFetching ? 'Refreshing' : 'Live'}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1">
        {currentView === 'dashboard' ? (
          <div className="px-4 py-6 sm:px-6">
            <header className="max-w-7xl mx-auto mb-8 overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-6 shadow-2xl shadow-slate-950/30">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                  <Activity size={13} /> IDX Market Intelligence
                </div>
                <h1 className="text-3xl font-bold text-white sm:text-4xl">Market Overview</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Pantau saham IDX, trend teknikal, whale activity, dan watchlist target dalam satu dashboard publik yang bersih.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 lg:justify-end">
                <span>{settings.autoRefresh ? `Auto refresh every ${settings.refreshInterval / 1000} seconds` : 'Auto refresh off'}</span>
                <button
                  type="button"
                  onClick={toggleWatchlistMode}
                  className={`rounded-full border px-3 py-1 transition-colors ${showWatchlistOnly ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-300' : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'}`}
                >
                  {showWatchlistOnly ? 'Showing Watchlist' : `${watchlist.length} watchlist items`}
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={importWatchlist}
                />
                <button type="button" onClick={() => importInputRef.current?.click()} className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300 hover:text-white">
                  <Upload size={12} /> Import
                </button>
                {watchlist.length > 0 && (
                  <>
                    <button type="button" onClick={exportWatchlist} className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300 hover:text-white">
                      <Download size={12} /> Export
                    </button>
                    <button type="button" onClick={clearWatchlist} className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300 hover:text-white">
                      Clear watchlist
                    </button>
                  </>
                )}
              </div>
              </div>
            </header>

            <HealthBanner health={healthData} isLoading={isHealthLoading} isError={isHealthError} isDebug={isDebugMode} />

            {isDebugMode && <ProviderDiagnosticsPanel diagnostics={providerDiagnostics} isLoading={isProviderDiagnosticsLoading} isError={isProviderDiagnosticsError} />}

            <SectorBoard sectorSummary={sectorSummary} />

            <WatchlistBoard stocks={stocks} watchlist={watchlist} onOpenTicker={openTickerFromAlert} onUpdateWatchlistItem={updateWatchlistItem} />

            <section className="max-w-7xl mx-auto mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <SummaryCard label="Loaded" value={marketSummary.loaded} helper={marketSummary.isMarketWide ? 'Cached market-wide' : 'Stocks on this page'} icon={Activity} tone="blue" />
              <SummaryCard label="Gainers" value={marketSummary.gainers} helper={`${marketSummary.unchanged} unchanged`} icon={TrendingUp} tone="green" />
              <SummaryCard label="Losers" value={marketSummary.losers} helper="Negative movers" icon={TrendingDown} tone="red" />
              <SummaryCard label="Near Target" value={nearTargetCount} helper="Watchlist alerts on this page" icon={BarChart3} tone="yellow" />
              <SummaryCard label="Portfolio P/L" value={`${portfolioSummary.unrealizedPnL >= 0 ? '+' : ''}${formatCompact(portfolioSummary.unrealizedPnL)}`} helper={`${portfolioSummary.positions} positions - ${portfolioSummary.unrealizedPnLPercent.toFixed(2)}%`} icon={Activity} tone={portfolioSummary.unrealizedPnL >= 0 ? 'green' : 'red'} />
              <SummaryCard label="Top Sector" value={leadingSector.sector} helper={`${leadingSector.count} tickers - ${leadingSector.averageChange?.toFixed(2) ?? '0.00'}% avg`} icon={BarChart3} tone="yellow" />
            </section>

            <main className="max-w-7xl mx-auto grid grid-cols-1 gap-6 lg:grid-cols-12 lg:min-h-[680px]">
              <div className="lg:col-span-4 h-full">
                {isLoading && !stocks.length ? (
                  <div className="h-full bg-idx-card rounded-xl animate-pulse"></div>
                ) : error ? (
                  <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded-lg">
                    Failed to load market data. Ensure backend is running.
                  </div>
                ) : (
                  <StockTable
                    stocks={visibleStocks}
                    selectedTicker={selectedTicker}
                    onSelectStock={setSelectedTicker}
                    page={page}
                    setPage={setPage}
                    totalPages={totalPages}
                    search={search}
                    setSearch={setSearch}
                    isLoading={isLoading || isFetching || stockData === undefined}
                    defaultSort={settings.defaultTableSort}
                    compactMode={settings.compactMode}
                    watchlist={watchlistTickers}
                    onToggleWatchlist={toggleWatchlist}
                    showWatchlistOnly={showWatchlistOnly}
                  />
                )}
              </div>

              <div className="lg:col-span-8 h-full">
                <Suspense fallback={<PanelFallback label="chart" />}>
                  <StockChart
                    ticker={selectedTicker}
                    defaultPeriod={settings.defaultChartPeriod}
                    compactMode={settings.compactMode}
                    autoRefresh={settings.autoRefresh}
                    refreshInterval={settings.refreshInterval}
                  />
                </Suspense>
              </div>
            </main>
          </div>
        ) : (
          <Suspense fallback={<PanelFallback label="whale alerts" />}>
            <WhaleAlerts onOpenTicker={openTickerFromAlert} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;

