import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, keepPreviousData } from '@tanstack/react-query';
import WhaleAlerts from './components/WhaleAlerts';
import StockTable from './components/StockTable';
import StockChart from './components/StockChart';
import { fetchStocks } from './api';
import { LayoutDashboard, Radar, Clock } from 'lucide-react';

const queryClient = new QueryClient();
const WATCHLIST_STORAGE_KEY = 'idx-monitor-watchlist';

function Dashboard() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTicker, setSelectedTicker] = useState('BBCA');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  const { data: stockData, isLoading, isFetching, error, dataUpdatedAt } = useQuery({
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

  const stocks = stockData?.data || [];
  const totalPages = stockData?.total_pages || 1;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID') : '-';

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
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'dashboard' ? 'bg-idx-card text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
              >
                <LayoutDashboard size={16} /> Market Data
              </button>
              <button
                onClick={() => setCurrentView('whales')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'whales' ? 'bg-idx-card text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Radar size={16} /> Whale Alerts
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
              <div className="text-xs text-slate-400">
                Auto refresh every 10 seconds - {watchlist.length} watchlist items
              </div>
            </header>

            <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)]">
              <div className="lg:col-span-4 h-full">
                {isLoading && !stocks.length ? (
                  <div className="h-full bg-idx-card rounded-xl animate-pulse"></div>
                ) : error ? (
                  <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded-lg">
                    Failed to load market data. Ensure backend is running.
                  </div>
                ) : (
                  <StockTable
                    stocks={stocks}
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
                  />
                )}
              </div>

              <div className="lg:col-span-8 h-full">
                <StockChart ticker={selectedTicker} />
              </div>
            </main>
          </div>
        ) : (
          <WhaleAlerts />
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
