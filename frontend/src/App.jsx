import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, keepPreviousData } from '@tanstack/react-query';
import StockTable from './components/StockTable';
import { fetchStocks } from './api';
import { Activity, BarChart3, LayoutDashboard, Radar, Clock, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';

const StockChart = lazy(() => import('./components/StockChart'));
const WhaleAlerts = lazy(() => import('./components/WhaleAlerts'));

const queryClient = new QueryClient();
const WATCHLIST_STORAGE_KEY = 'idx-monitor-watchlist';

const PanelFallback = ({ label }) => (
  <div className="bg-idx-card rounded-xl border border-slate-700 h-full flex items-center justify-center text-slate-400">
    <div className="animate-pulse">Loading {label}...</div>
  </div>
);

const formatCompact = (value) => new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(value || 0);

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
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTicker, setSelectedTicker] = useState('BBCA');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
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
    refetchInterval: 10000,
    placeholderData: keepPreviousData,
    enabled: currentView === 'dashboard',
  });

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

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
  };

  const stocks = useMemo(() => stockData?.data || [], [stockData]);
  const totalPages = stockData?.total_pages || 1;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID') : '-';
  const visibleStocks = useMemo(() => (
    showWatchlistOnly ? stocks.filter((stock) => watchlist.includes(stock.ticker)) : stocks
  ), [showWatchlistOnly, stocks, watchlist]);
  const marketSummary = useMemo(() => {
    const gainers = stocks.filter((stock) => stock.change_percent > 0).length;
    const losers = stocks.filter((stock) => stock.change_percent < 0).length;
    const unchanged = stocks.filter((stock) => stock.change_percent === 0).length;
    const topVolume = stocks.reduce((highest, stock) => (
      (stock.volume || 0) > (highest.volume || 0) ? stock : highest
    ), { ticker: '-', volume: 0 });

    return {
      loaded: stocks.length,
      gainers,
      losers,
      unchanged,
      topVolume,
    };
  }, [stocks]);

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
    <div className="min-h-screen bg-idx-dark text-idx-text font-sans flex flex-col">
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
                onClick={() => refetch()}
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
                <span>Auto refresh every 10 seconds</span>
                <button
                  type="button"
                  onClick={toggleWatchlistMode}
                  className={`rounded-full border px-3 py-1 transition-colors ${showWatchlistOnly ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-300' : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'}`}
                >
                  {showWatchlistOnly ? 'Showing Watchlist' : `${watchlist.length} watchlist items`}
                </button>
                {watchlist.length > 0 && (
                  <button type="button" onClick={clearWatchlist} className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300 hover:text-white">
                    Clear watchlist
                  </button>
                )}
              </div>
            </header>

            <section className="max-w-7xl mx-auto mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Loaded" value={marketSummary.loaded} helper="Stocks on this page" icon={Activity} tone="blue" />
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
                    watchlist={watchlist}
                    onToggleWatchlist={toggleWatchlist}
                    showWatchlistOnly={showWatchlistOnly}
                  />
                )}
              </div>

              <div className="lg:col-span-8 h-full">
                <Suspense fallback={<PanelFallback label="chart" />}>
                  <StockChart ticker={selectedTicker} />
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
