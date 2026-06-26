import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, keepPreviousData } from '@tanstack/react-query';
import StockTable from './components/StockTable';
import { fetchHealth, fetchMarketSummary, fetchStocks } from './api';
import { Activity, BarChart3, Download, LayoutDashboard, Radar, Clock, RefreshCw, Settings, TrendingDown, TrendingUp, Upload, X } from 'lucide-react';

const StockChart = lazy(() => import('./components/StockChart'));
const WhaleAlerts = lazy(() => import('./components/WhaleAlerts'));

const queryClient = new QueryClient();
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

const HealthBanner = ({ health, isLoading, isError }) => {
  const isDegraded = isError || health?.status === 'degraded';
  const coverage = health?.cache_coverage_percent ?? 0;
  const unavailableCount = health?.unavailable_tickers_count ?? 0;
  const workerLabel = health?.worker_running ? 'Worker active' : 'Worker warming up';

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
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 lg:min-w-[560px]">
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-500">Cache Coverage</div>
            <div className="mt-1 text-lg font-bold text-white">{coverage}%</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-500">Cached Stocks</div>
            <div className="mt-1 text-lg font-bold text-white">{health?.cached_stocks ?? 0}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-500">Unavailable</div>
            <div className={`mt-1 text-lg font-bold ${unavailableCount ? 'text-yellow-300' : 'text-white'}`}>{unavailableCount}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-500">Current Batch</div>
            <div className="mt-1 text-lg font-bold text-white">{health?.current_batch_size ?? 0}</div>
          </div>
        </div>
      </div>
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

const WatchlistBoard = ({ stocks, watchlist, onOpenTicker }) => {
  if (watchlist.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto mb-6 rounded-xl border border-slate-700 bg-idx-card p-4" aria-label="Watchlist board">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-white">Watchlist Board</h2>
          <p className="text-xs text-slate-400">Quick access to your saved tickers on the current data page.</p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{watchlist.length} saved</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {watchlist.slice(0, 8).map((ticker) => {
          const stock = stocks.find((item) => item.ticker === ticker);
          return (
            <button key={ticker} type="button" onClick={() => onOpenTicker(ticker)} className="rounded-lg border border-slate-700 bg-slate-800/70 p-3 text-left transition-colors hover:border-idx-accent focus:outline-none focus:ring-2 focus:ring-idx-accent">
              <div className="font-bold text-white">{ticker}</div>
              <div className="mt-1 truncate text-xs text-slate-400">{stock?.name || 'Open ticker chart'}</div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-mono text-slate-200">{stock ? formatCompact(stock.last_price) : '-'}</span>
                <span className={stock?.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}>{stock ? `${stock.change_percent}%` : 'Open'}</span>
              </div>
            </button>
          );
        })}
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
    <div className="rounded-xl border border-slate-700 bg-idx-card p-4 shadow-lg">
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
      return JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY)) || [];
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

  const addToast = (toast) => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setToasts((currentToasts) => [...currentToasts, { id, type: 'success', ...toast }]);
    setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((item) => item.id !== id));
    }, 4200);
  };

  const dismissToast = (id) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (nextSettings) => {
    setSettings((currentSettings) => ({ ...currentSettings, ...nextSettings }));
  };

  useEffect(() => {
    if (error) {
      addToast({ type: 'error', title: 'Market data unavailable', message: 'Backend may be offline or still warming up.' });
    }
  }, [error]);

  const toggleWatchlist = (ticker) => {
    setWatchlist((currentWatchlist) => (
      currentWatchlist.includes(ticker)
        ? currentWatchlist.filter((item) => item !== ticker)
        : [...currentWatchlist, ticker]
    ));
  };

  const clearWatchlist = () => {
    setWatchlist([]);
    setShowWatchlistOnly(false);
    addToast({ title: 'Watchlist cleared', message: 'All saved tickers were removed.' });
  };

  const exportWatchlist = () => {
    const payload = {
      app: 'IDX Monitor',
      exported_at: new Date().toISOString(),
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
        if (!Array.isArray(importedWatchlist)) return;

        const normalizedWatchlist = [...new Set(
          importedWatchlist
            .map((ticker) => String(ticker).trim().toUpperCase())
            .filter(Boolean)
        )];
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
  const totalPages = stockData?.total_pages || 1;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID') : '-';
  const visibleStocks = useMemo(() => (
    showWatchlistOnly ? stocks.filter((stock) => watchlist.includes(stock.ticker)) : stocks
  ), [showWatchlistOnly, stocks, watchlist]);
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

  const openTickerFromAlert = (ticker) => {
    setSelectedTicker(ticker);
    setCurrentView('dashboard');
    setSearch(ticker);
    setPage(1);
  };

  const toggleWatchlistMode = () => {
    const nextValue = !showWatchlistOnly;
    setShowWatchlistOnly(nextValue);

    if (!nextValue) return;

    const firstWatchlistStock = stocks.find((stock) => watchlist.includes(stock.ticker));
    if (firstWatchlistStock && !watchlist.includes(selectedTicker)) {
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
          <div className="p-6">
            <header className="max-w-7xl mx-auto mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Market Overview</h1>
                <p className="text-slate-400 text-sm">Real-time prices from Indonesia Stock Exchange</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
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
            </header>

            <HealthBanner health={healthData} isLoading={isHealthLoading} isError={isHealthError} />

            <WatchlistBoard stocks={stocks} watchlist={watchlist} onOpenTicker={openTickerFromAlert} />

            <section className="max-w-7xl mx-auto mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Loaded" value={marketSummary.loaded} helper={marketSummary.isMarketWide ? 'Cached market-wide' : 'Stocks on this page'} icon={Activity} tone="blue" />
              <SummaryCard label="Gainers" value={marketSummary.gainers} helper={`${marketSummary.unchanged} unchanged`} icon={TrendingUp} tone="green" />
              <SummaryCard label="Losers" value={marketSummary.losers} helper="Negative movers" icon={TrendingDown} tone="red" />
              <SummaryCard label="Top Volume" value={marketSummary.topVolume.ticker} helper={formatCompact(marketSummary.topVolume.volume)} icon={BarChart3} tone="yellow" />
            </section>

            <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-360px)] min-h-[560px]">
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
                    watchlist={watchlist}
                    onToggleWatchlist={toggleWatchlist}
                    showWatchlistOnly={showWatchlistOnly}
                  />
                )}
              </div>

              <div className="lg:col-span-8 h-full">
                <Suspense fallback={<PanelFallback label="chart" />}>
                  <StockChart ticker={selectedTicker} defaultPeriod={settings.defaultChartPeriod} compactMode={settings.compactMode} />
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
