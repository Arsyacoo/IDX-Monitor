import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchScannerResults } from '../../api';
import { BarChart3, Search, RefreshCw, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCompact } from '../../utils/formatters';

const TechnicalScanner = ({ onOpenTicker }) => {
  const [criteria, setCriteria] = useState('rsi_oversold');
  const [search, setSearch] = useState('');

  const { data: results = [], isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['scannerResults', criteria],
    queryFn: () => fetchScannerResults(criteria),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  const filteredResults = useMemo(() => {
    if (!search.trim()) return results;
    const query = search.toLowerCase();
    return results.filter(
      (item) =>
        item.ticker.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.sector.toLowerCase().includes(query)
    );
  }, [results, search]);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID') : '-';

  const criteriaList = [
    { key: 'rsi_oversold', label: 'RSI Oversold (≤ 30)', desc: 'Indikasi harga jenuh jual, peluang rebound naik.', tone: 'green' },
    { key: 'rsi_overbought', label: 'RSI Overbought (≥ 70)', desc: 'Indikasi harga jenuh beli, risiko koreksi turun.', tone: 'red' },
    { key: 'golden_cross', label: 'Golden Cross (MA20 > MA50)', desc: 'MA20 memotong ke atas MA50, sinyal tren naik baru.', tone: 'blue' },
    { key: 'death_cross', label: 'Death Cross (MA20 < MA50)', desc: 'MA20 memotong ke bawah MA50, sinyal tren turun baru.', tone: 'red' },
    { key: 'bullish_trend', label: 'Bullish Alignment', desc: 'Harga berada dalam jalur tren naik terkonfirmasi.', tone: 'green' },
    { key: 'bearish_trend', label: 'Bearish Alignment', desc: 'Harga berada dalam jalur tren turun terkonfirmasi.', tone: 'red' },
  ];

  const currentCriteriaInfo = criteriaList.find((item) => item.key === criteria);

  return (
    <div className="p-6 min-h-screen bg-idx-dark text-idx-text">
      <header className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <BarChart3 size={28} />
              </div>
              <h1 className="text-3xl font-bold text-white">Technical Scanner</h1>
            </div>
            <p className="text-slate-400">Pindai seluruh saham IDX secara otomatis berdasarkan indikator teknikal utama.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">Updated {lastUpdated}</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Filter Panel */}
        <section className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-idx-card p-5">
            <h2 className="font-bold text-white mb-4">Sinyal Teknikal</h2>
            <div className="space-y-2">
              {criteriaList.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setCriteria(item.key);
                    setSearch('');
                  }}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                    criteria === item.key
                      ? 'border-indigo-500 bg-indigo-500/10 text-white font-medium shadow-md shadow-indigo-950/20'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span>{item.label}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.tone === 'green' ? 'bg-emerald-400' : item.tone === 'red' ? 'bg-red-400' : 'bg-blue-400'
                      }`}
                    ></span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right Side Scanner Output */}
        <section className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-idx-card p-5 flex flex-col h-full min-h-[500px]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white">{currentCriteriaInfo?.label}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{currentCriteriaInfo?.desc}</p>
              </div>
              <div className="relative max-w-xs w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari ticker atau nama..."
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 pl-9 pr-4 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3 flex-1">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="h-14 border border-slate-800/60 bg-slate-900/40 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-red-200 bg-red-950/10 border border-red-900/30 rounded-2xl">
                <AlertTriangle size={36} className="text-red-400 mb-3" />
                <h4 className="font-semibold text-white">Gagal Memuat Hasil Scan</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">Pastikan server backend Anda menyala dan SQLite cache sudah memuat riwayat harga.</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-500 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl">
                <CheckCircle size={36} className="text-slate-600 mb-3" />
                <h4 className="font-semibold text-slate-300">Tidak Ada Hasil Cocok</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Saat ini tidak ada emiten IDX yang memicu sinyal teknikal ini di dalam memori database cache.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                      <th className="pb-3 pl-2">Ticker</th>
                      <th className="pb-3">Nama Saham</th>
                      <th className="pb-3 text-right">Harga</th>
                      <th className="pb-3 text-right">Change</th>
                      <th className="pb-3 text-center">RSI(14)</th>
                      <th className="pb-3 text-center">MA20</th>
                      <th className="pb-3 text-center">MA50</th>
                      <th className="pb-3 text-center">Tren</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredResults.map((item) => {
                      const isGainer = item.change_percent >= 0;
                      return (
                        <tr key={item.ticker} className="hover:bg-slate-850/50 transition-colors group">
                          <td className="py-3 pl-2">
                            <button
                              type="button"
                              onClick={() => onOpenTicker(item.ticker)}
                              className="font-bold text-white group-hover:text-indigo-400 transition-colors focus:outline-none"
                            >
                              {item.ticker}
                            </button>
                          </td>
                          <td className="py-3 max-w-[180px] truncate text-slate-400 group-hover:text-slate-200 transition-colors">
                            {item.name}
                          </td>
                          <td className="py-3 text-right font-mono font-medium text-slate-300">
                            {formatCompact(item.last_price)}
                          </td>
                          <td className="py-3 text-right font-mono font-semibold">
                            <span className={`inline-flex items-center gap-0.5 ${isGainer ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isGainer ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                              {isGainer ? '+' : ''}
                              {item.change_percent}%
                            </span>
                          </td>
                          <td className="py-3 text-center font-mono text-slate-300">
                            <span
                              className={`px-1.5 py-0.5 rounded font-semibold ${
                                item.rsi14 <= 30
                                  ? 'bg-emerald-500/10 text-emerald-300'
                                  : item.rsi14 >= 70
                                  ? 'bg-red-500/10 text-red-300'
                                  : 'text-slate-300'
                              }`}
                            >
                              {item.rsi14 ? item.rsi14.toFixed(1) : '-'}
                            </span>
                          </td>
                          <td className="py-3 text-center font-mono text-slate-400">
                            {item.ma20 ? formatCompact(item.ma20) : '-'}
                          </td>
                          <td className="py-3 text-center font-mono text-slate-400">
                            {item.ma50 ? formatCompact(item.ma50) : '-'}
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                item.trend_label === 'Bullish'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : item.trend_label === 'Bearish'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {item.trend_label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
              <span>Menampilkan {filteredResults.length} emiten lolos filter.</span>
              <span>Klik ticker emiten untuk melihat grafik.</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TechnicalScanner;
