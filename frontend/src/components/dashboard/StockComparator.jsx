import React, { useMemo, useState, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import { fetchStockHistory } from '../../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Scale, Search, RefreshCw, X, Plus, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCompact } from '../../utils/formatters';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6']; // Blue, Green, Purple

const StockComparator = ({ onOpenTicker }) => {
  const [tickerInput, setTickerInput] = useState('');
  const [selectedTickers, setSelectedTickers] = useState(['BBCA', 'BBRI']);
  const [period, setPeriod] = useState('1mo');

  const results = useQueries({
    queries: selectedTickers.map((ticker) => ({
      queryKey: ['stockDetail', ticker, period],
      queryFn: () => fetchStockHistory(ticker, period),
      enabled: !!ticker,
      retry: false,
    })),
  });

  // Handle invalid/failed tickers gracefully
  useEffect(() => {
    results.forEach((res, index) => {
      if (res.isError) {
        const failedTicker = selectedTickers[index];
        setSelectedTickers((current) => current.filter((t) => t !== failedTicker));
        alert(`Saham ${failedTicker} tidak ditemukan atau gagal dimuat.`);
      }
    });
  }, [results, selectedTickers]);

  const handleAddTicker = (e) => {
    e.preventDefault();
    const cleanTicker = tickerInput.trim().toUpperCase();
    if (!cleanTicker) return;

    if (selectedTickers.includes(cleanTicker)) {
      alert(`${cleanTicker} sudah ada di dalam perbandingan.`);
      setTickerInput('');
      return;
    }

    if (selectedTickers.length >= 3) {
      alert('Maksimal perbandingan adalah 3 saham sekaligus.');
      return;
    }

    setSelectedTickers((prev) => [...prev, cleanTicker]);
    setTickerInput('');
  };

  const handleRemoveTicker = (ticker) => {
    if (selectedTickers.length <= 1) {
      alert('Minimal harus ada 1 saham untuk dibandingkan.');
      return;
    }
    setSelectedTickers((prev) => prev.filter((t) => t !== ticker));
  };

  const isLoading = results.some((res) => res.isLoading);
  const isFetching = results.some((res) => res.isFetching);

  // Align dates and convert prices to relative percentage change
  const chartData = useMemo(() => {
    const allDates = new Set();
    results.forEach((res) => {
      if (res.data?.history) {
        res.data.history.forEach((pt) => allDates.add(pt.date));
      }
    });

    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map((date) => {
      const row = { date };
      results.forEach((res) => {
        if (res.data && res.data.history && res.data.history.length > 0) {
          const ticker = res.data.ticker;
          const pt = res.data.history.find((p) => p.date === date);
          if (pt) {
            const initialPrice = res.data.history[0].price || 1;
            row[ticker] = parseFloat((((pt.price - initialPrice) / initialPrice) * 100).toFixed(2));
          }
        }
      });
      return row;
    });
  }, [results]);

  return (
    <div className="p-6 min-h-screen bg-idx-dark text-idx-text">
      <header className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Scale size={28} />
              </div>
              <h1 className="text-3xl font-bold text-white">Stock Comparator</h1>
            </div>
            <p className="text-slate-400">Bandingkan kinerja relatif (%) dan metrik teknikal hingga 3 saham secara berdampingan.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {/* Period selector */}
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              {['5d', '1mo', '3mo', '6mo', '1y'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold uppercase transition-all ${
                    period === p ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p === '1mo' ? '1M' : p === '3mo' ? '3M' : p === '6mo' ? '6M' : p === '1y' ? '1Y' : p}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => results.forEach((res) => res.refetch())}
              className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Search Ticker Form */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <form onSubmit={handleAddTicker} className="relative flex items-center max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Masukkan kode emiten (misal: TLKM)..."
              className="w-full bg-slate-800 border border-slate-700 text-white pl-9 pr-12 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500 uppercase font-bold"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bg-indigo-500 hover:bg-indigo-600 text-white p-1 rounded-md transition-colors"
              aria-label="Add stock to comparison"
            >
              <Plus size={14} />
            </button>
          </form>

          {/* Active comparative chips */}
          <div className="flex flex-wrap gap-2">
            {selectedTickers.map((ticker, index) => (
              <div
                key={ticker}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }}></span>
                <span className="text-white">{ticker}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTicker(ticker)}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* Comparative Chart Card */}
        <div className="rounded-2xl border border-slate-800 bg-idx-card p-5">
          <h3 className="font-bold text-white mb-4">Grafik Kinerja Relatif (%)</h3>
          {isLoading ? (
            <div className="h-80 flex items-center justify-center bg-slate-900/30 rounded-xl animate-pulse">
              <span className="text-slate-500 text-sm">Loading historical data...</span>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}%`} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    formatter={(val) => [`${val > 0 ? '+' : ''}${val}%`, 'Perubahan']}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {selectedTickers.map((ticker, index) => (
                    <Line
                      key={ticker}
                      type="monotone"
                      dataKey={ticker}
                      stroke={COLORS[index]}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Matrix Comparison Card */}
        <div className="rounded-2xl border border-slate-800 bg-idx-card p-5 overflow-x-auto">
          <h3 className="font-bold text-white mb-4">Matriks Perbandingan Teknikal</h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                <th className="pb-3 pl-2">Parameter</th>
                {selectedTickers.map((ticker, index) => (
                  <th key={ticker} className="pb-3 text-center" style={{ color: COLORS[index] }}>
                    {ticker}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr className="hover:bg-slate-850/50 transition-colors">
                <td className="py-4 pl-2 font-semibold text-slate-300">Nama Perusahaan</td>
                {results.map((res, index) => (
                  <td key={index} className="py-4 text-center text-white font-medium">
                    {res.isLoading ? '...' : res.data?.name || '-'}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-850/50 transition-colors">
                <td className="py-4 pl-2 font-semibold text-slate-300">Harga Terakhir</td>
                {results.map((res, index) => (
                  <td key={index} className="py-4 text-center font-mono text-white font-semibold">
                    {res.isLoading ? '...' : res.data ? formatCompact(res.data.last_price) : '-'}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-850/50 transition-colors">
                <td className="py-4 pl-2 font-semibold text-slate-300">Perubahan Harian</td>
                {results.map((res, index) => {
                  const isGainer = (res.data?.change_percent ?? 0) >= 0;
                  return (
                    <td key={index} className={`py-4 text-center font-mono font-bold ${isGainer ? 'text-emerald-400' : 'text-red-400'}`}>
                      {res.isLoading ? '...' : res.data ? `${isGainer ? '+' : ''}${res.data.change_percent}%` : '-'}
                    </td>
                  );
                })}
              </tr>
              <tr className="hover:bg-slate-850/50 transition-colors">
                <td className="py-4 pl-2 font-semibold text-slate-300">Indikator RSI (14)</td>
                {results.map((res, index) => {
                  const rsi = res.data?.technical_indicators?.rsi14;
                  return (
                    <td key={index} className="py-4 text-center font-mono">
                      {res.isLoading ? '...' : rsi !== null && rsi !== undefined ? (
                        <span className={`px-2 py-0.5 rounded font-bold ${rsi <= 30 ? 'bg-emerald-500/10 text-emerald-300' : rsi >= 70 ? 'bg-red-500/10 text-red-300' : 'bg-slate-800 text-slate-300'}`}>
                          {rsi.toFixed(1)}
                        </span>
                      ) : '-'}
                    </td>
                  );
                })}
              </tr>
              <tr className="hover:bg-slate-850/50 transition-colors">
                <td className="py-4 pl-2 font-semibold text-slate-300">Nilai MA20</td>
                {results.map((res, index) => (
                  <td key={index} className="py-4 text-center font-mono text-slate-400">
                    {res.isLoading ? '...' : res.data?.technical_indicators?.ma20 ? formatCompact(res.data.technical_indicators.ma20) : '-'}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-850/50 transition-colors">
                <td className="py-4 pl-2 font-semibold text-slate-300">Nilai MA50</td>
                {results.map((res, index) => (
                  <td key={index} className="py-4 text-center font-mono text-slate-400">
                    {res.isLoading ? '...' : res.data?.technical_indicators?.ma50 ? formatCompact(res.data.technical_indicators.ma50) : '-'}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-850/50 transition-colors">
                <td className="py-4 pl-2 font-semibold text-slate-300">Tren Teknikal</td>
                {results.map((res, index) => {
                  const trend = res.data?.technical_indicators?.trend_label;
                  return (
                    <td key={index} className="py-4 text-center font-semibold">
                      {res.isLoading ? '...' : trend ? (
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${trend === 'Bullish' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : trend === 'Bearish' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-400'}`}>
                          {trend}
                        </span>
                      ) : '-'}
                    </td>
                  );
                })}
              </tr>
              <tr className="hover:bg-slate-850/50 transition-colors">
                <td className="py-4 pl-2 font-semibold text-slate-300">Sektor</td>
                {results.map((res, index) => (
                  <td key={index} className="py-4 text-center text-slate-400 font-medium">
                    {res.isLoading ? '...' : res.data?.sector || '-'}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-850/50 transition-colors">
                <td className="py-4 pl-2 font-semibold text-slate-300">Navigasi</td>
                {results.map((res, index) => (
                  <td key={index} className="py-4 text-center">
                    {res.isLoading ? '...' : res.data ? (
                      <button
                        type="button"
                        onClick={() => onOpenTicker(res.data.ticker)}
                        className="text-xs bg-slate-800 border border-slate-700 hover:border-indigo-500 hover:text-white px-3 py-1 rounded-md transition-all"
                      >
                        Buka Chart Detail
                      </button>
                    ) : '-'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default StockComparator;
