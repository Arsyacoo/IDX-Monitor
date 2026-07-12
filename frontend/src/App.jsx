import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, keepPreviousData } from '@tanstack/react-query';
import StockTable from './components/StockTable';
import { fetchHealth, fetchMarketSummary, fetchProviderDiagnostics, fetchStocks } from './api';
import { Activity, BarChart3, Download, LayoutDashboard, Radar, Clock, RefreshCw, Settings, TrendingDown, TrendingUp, Upload, X, Newspaper } from 'lucide-react';

import HealthBanner from './components/dashboard/HealthBanner';
import ProviderDiagnosticsPanel from './components/dashboard/ProviderDiagnosticsPanel';
import SectorBoard from './components/dashboard/SectorBoard';
import SummaryCard from './components/dashboard/SummaryCard';
import WatchlistBoard from './components/watchlist/WatchlistBoard';
import ToastStack from './components/ui/ToastStack';
import SettingsPanel from './components/ui/SettingsPanel';

import { formatCompact } from './utils/formatters';
import {
  WATCHLIST_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  DEFAULT_SETTINGS,
  normalizeWatchlistItem,
  normalizeWatchlist,
  getTargetStatus,
  getPortfolioPosition,
} from './utils/watchlistHelpers';

const StockChart = lazy(() => import('./components/StockChart'));
const WhaleAlerts = lazy(() => import('./components/WhaleAlerts'));
const MarketNews = lazy(() => import('./components/dashboard/MarketNews'));
const TechnicalScanner = lazy(() => import('./components/dashboard/TechnicalScanner'));

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

const PanelFallback = ({ label }) => (
  <div className="bg-idx-card rounded-xl border border-slate-700 h-full flex items-center justify-center text-slate-400">
    <div className="animate-pulse">Loading {label}...</div>
  </div>
);

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
              <button
                onClick={() => setCurrentView('news')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'news' ? 'bg-idx-card text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                <Newspaper size={16} /> Market News
              </button>
              <button
                onClick={() => setCurrentView('scanner')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'scanner' ? 'bg-idx-card text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                <BarChart3 size={16} /> Scanner
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
        {currentView === 'dashboard' && (
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
        )}
        {currentView === 'whales' && (
          <Suspense fallback={<PanelFallback label="whale alerts" />}>
            <WhaleAlerts onOpenTicker={openTickerFromAlert} />
          </Suspense>
        )}
        {currentView === 'news' && (
          <Suspense fallback={<PanelFallback label="market news" />}>
            <MarketNews />
          </Suspense>
        )}
        {currentView === 'scanner' && (
          <Suspense fallback={<PanelFallback label="scanner" />}>
            <TechnicalScanner onOpenTicker={openTickerFromAlert} />
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

