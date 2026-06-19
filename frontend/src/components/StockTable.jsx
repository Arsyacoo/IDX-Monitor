import React, { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Loader2, Star } from 'lucide-react';

const formatPrice = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(value || 0);

const formatVolume = (value) => {
    const volume = Number(value || 0);
    if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(1)}B`;
    if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
    if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
    return volume.toLocaleString('id-ID');
};

const StockTable = ({
    stocks,
    onSelectStock,
    selectedTicker,
    page,
    setPage,
    totalPages,
    search,
    setSearch,
    isLoading,
    watchlist,
    onToggleWatchlist,
    showWatchlistOnly = false,
}) => {
    const [localSearch, setLocalSearch] = useState(search);
    const [sortBy, setSortBy] = useState('ticker');
    const [filterBy, setFilterBy] = useState('all');

    useEffect(() => {
        setLocalSearch(search);
    }, [search]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localSearch !== search) {
                setSearch(localSearch);
                setPage(1);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [localSearch, search, setPage, setSearch]);

    const visibleStocks = useMemo(() => {
        const filteredStocks = stocks.filter((stock) => {
            if (filterBy === 'watchlist') return watchlist.includes(stock.ticker);
            if (filterBy === 'gainers') return stock.change_percent > 0;
            if (filterBy === 'losers') return stock.change_percent < 0;
            if (filterBy === 'top-volume') return Number(stock.volume || 0) > 0;
            return true;
        });

        return [...filteredStocks].sort((firstStock, secondStock) => {
            if (sortBy === 'price-desc') return secondStock.last_price - firstStock.last_price;
            if (sortBy === 'volume-desc') return (secondStock.volume || 0) - (firstStock.volume || 0);
            if (sortBy === 'change-desc') return secondStock.change_percent - firstStock.change_percent;
            if (sortBy === 'change-asc') return firstStock.change_percent - secondStock.change_percent;
            return firstStock.ticker.localeCompare(secondStock.ticker);
        });
    }, [stocks, filterBy, sortBy, watchlist]);

    useEffect(() => {
        if (filterBy === 'top-volume') {
            setSortBy('volume-desc');
        }
        if (filterBy === 'gainers') {
            setSortBy('change-desc');
        }
        if (filterBy === 'losers') {
            setSortBy('change-asc');
        }
    }, [filterBy]);

    return (
        <div className="bg-idx-card rounded-xl shadow-lg border border-slate-700 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-700 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        IDX Market Data
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-idx-accent" />}
                    </h2>
                    <span className="text-xs text-slate-400">{watchlist.length} favorit</span>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search Ticker (e.g., ADRO)..."
                        className="w-full bg-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-idx-accent transition-all"
                        value={localSearch}
                        onChange={(event) => setLocalSearch(event.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <select
                        value={filterBy}
                        onChange={(event) => setFilterBy(event.target.value)}
                        className="bg-slate-800 border border-slate-700 text-sm text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-idx-accent"
                    >
                        <option value="all">Semua saham</option>
                        <option value="watchlist">Watchlist</option>
                        <option value="gainers">Top Gainers</option>
                        <option value="losers">Top Losers</option>
                        <option value="top-volume">Top Volume</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                        className="bg-slate-800 border border-slate-700 text-sm text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-idx-accent"
                    >
                        <option value="ticker">Ticker A-Z</option>
                        <option value="change-desc">Change tertinggi</option>
                        <option value="change-asc">Change terendah</option>
                        <option value="volume-desc">Volume terbesar</option>
                        <option value="price-desc">Harga tertinggi</option>
                    </select>
                </div>
            </div>

            <div className="overflow-y-auto flex-1">
                <table className="w-full text-left">
                    <thead className="bg-slate-700 sticky top-0 z-10">
                        <tr>
                            <th className="p-4 font-semibold text-sm text-gray-300">Ticker</th>
                            <th className="p-4 font-semibold text-sm text-gray-300">Price</th>
                            <th className="p-4 font-semibold text-sm text-gray-300">Vol</th>
                            <th className="p-4 font-semibold text-sm text-gray-300">Change</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {visibleStocks.map((stock) => {
                            const isFavorite = watchlist.includes(stock.ticker);

                            return (
                                <tr
                                    key={stock.ticker}
                                    onClick={() => onSelectStock(stock.ticker)}
                                    className={`cursor-pointer transition-colors hover:bg-slate-700/50 ${selectedTicker === stock.ticker ? 'bg-slate-700/80 border-l-4 border-idx-accent' : ''}`}
                                >
                                    <td className="p-4 py-3">
                                        <div className="flex items-start gap-2">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onToggleWatchlist(stock.ticker);
                                                }}
                                                className={`mt-0.5 transition-colors ${isFavorite ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-300'}`}
                                                aria-label={isFavorite ? `Remove ${stock.ticker} from watchlist` : `Add ${stock.ticker} to watchlist`}
                                            >
                                                <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                                            </button>
                                            <div>
                                                <div className="font-bold text-white mb-0.5">{stock.ticker}</div>
                                                <div className="text-xs text-gray-400 truncate max-w-[100px]">{stock.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 py-3 text-white font-mono text-sm">
                                        {formatPrice(stock.last_price)}
                                    </td>
                                    <td className="p-4 py-3 text-slate-300 font-mono text-sm">
                                        {formatVolume(stock.volume)}
                                    </td>
                                    <td className={`p-4 py-3 font-bold ${stock.change_percent >= 0 ? 'text-idx-up' : 'text-idx-down'}`}>
                                        <div className="flex items-center gap-1">
                                            {stock.change_percent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            {stock.change_percent}%
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {visibleStocks.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-gray-400">
                                    {showWatchlistOnly ? 'Your watchlist is empty on this page. Add stocks with the star button or switch pages.' : 'No stocks found for this filter.'}
                                </td>
                            </tr>
                        )}
                        {stocks.length === 0 && isLoading && (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-gray-400">
                                    Searching...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-3 border-t border-slate-700 flex justify-between items-center bg-slate-800">
                <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-2 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="text-sm text-gray-400">
                    Page {page} of {totalPages}
                </span>
                <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default StockTable;
