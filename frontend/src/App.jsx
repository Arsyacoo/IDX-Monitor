import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, keepPreviousData } from '@tanstack/react-query';
import WhaleAlerts from './components/WhaleAlerts';
import StockTable from './components/StockTable';
import StockChart from './components/StockChart';
import { fetchStocks } from './api';
import { LayoutDashboard, Radar } from 'lucide-react';

const queryClient = new QueryClient();

function Dashboard() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'whales'
  const [selectedTicker, setSelectedTicker] = useState('BBCA');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: stockData, isLoading, error } = useQuery({
    queryKey: ['stocks', page, search],
    queryFn: () => fetchStocks({ page, limit: 10, search }),
    refetchInterval: 10000,
    placeholderData: keepPreviousData,
    enabled: currentView === 'dashboard', // Only fetch if on dashboard
  });

  const stocks = stockData?.data || [];
  const totalPages = stockData?.total_pages || 1;

  return (
    <div className="min-h-screen bg-idx-dark text-idx-text font-sans flex flex-col">
      {/* Navigation Bar */}
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
          <div className="text-xs text-green-400 flex items-center gap-1.5 bg-green-900/20 px-3 py-1 rounded-full border border-green-800/30">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            Live
          </div>
        </div>
      </nav>

      <div className="flex-1">
        {currentView === 'dashboard' ? (
          <div className="p-6">
            <header className="max-w-7xl mx-auto mb-8">
              <h1 className="text-2xl font-bold text-white">Market Overview</h1>
              <p className="text-slate-400 text-sm">Real-time prices from Indonesia Stock Exchange</p>
            </header>

            <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)]">
              {/* Left Panel: Stock List */}
              <div className="lg:col-span-4 h-full">
                {isLoading && !stocks.length ? (
                  <div className="h-full bg-idx-card rounded-xl animate-pulse"></div>
                ) : error ? (
                  <div className="text-red-500">Failed to load market data. Ensure backend is running.</div>
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
                  />
                )}
              </div>

              {/* Right Panel: Chart & Details */}
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
