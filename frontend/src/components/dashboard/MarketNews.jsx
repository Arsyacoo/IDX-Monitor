import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNews } from '../../api';
import { Newspaper, Search, RefreshCw, ExternalLink, Calendar } from 'lucide-react';

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const pubDate = new Date(dateStr);
    const now = new Date();
    const diffMs = now - pubDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    
    return pubDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const MarketNews = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: news = [], isLoading, isFetching, error, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['marketNews'],
    queryFn: fetchNews,
    refetchInterval: 120000, // Refresh every 2 minutes
    staleTime: 60000,
  });

  const filteredNews = useMemo(() => {
    if (!searchQuery.trim()) return news;
    const query = searchQuery.toLowerCase();
    return news.filter((item) => 
      item.title.toLowerCase().includes(query) || 
      item.source.toLowerCase().includes(query)
    );
  }, [news, searchQuery]);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID') : '-';

  return (
    <div className="p-6 min-h-screen bg-idx-dark text-idx-text">
      <header className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Newspaper size={28} />
              </div>
              <h1 className="text-3xl font-bold text-white">Market News Feed</h1>
            </div>
            <p className="text-slate-400">Berita pasar modal terkini dan sentimen emiten teragregasi otomatis.</p>
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

        <div className="mt-5 relative max-w-md">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari berita atau emiten (misal: BBCA, batu bara)..."
            className="w-full bg-slate-800 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-idx-accent transition-all placeholder:text-slate-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-48 border border-slate-800 bg-idx-card rounded-2xl p-5 flex flex-col justify-between animate-pulse">
                <div className="space-y-3">
                  <div className="h-4 bg-slate-700 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-full"></div>
                  <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                </div>
                <div className="h-3 bg-slate-700 rounded w-1/3 mt-4"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6 text-center text-red-200">
            Gagal memuat berita pasar. Silakan coba beberapa saat lagi.
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-idx-card p-12 text-center text-slate-400">
            Tidak ada berita yang cocok dengan kriteria pencarian Anda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map((item, index) => (
              <a
                key={index}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group border border-slate-800 bg-idx-card rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/40 transition-all duration-300"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {item.source || 'Market News'}
                    </span>
                    <ExternalLink size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-200 group-hover:text-white leading-snug transition-colors line-clamp-3">
                    {item.title}
                  </h2>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar size={13} />
                  <span>{formatRelativeTime(item.published)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MarketNews;
