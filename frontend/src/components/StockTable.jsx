import React from 'react';
import { Search, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';

const StockTable = ({ stocks, onSelectStock, selectedTicker, page, setPage, totalPages, search, setSearch }) => {

    // Client-side filtering removed since we do it on server now
    // Debounce search could be added here if needed, but for now simple onChange is okay for MVP

    return (
        <div className="bg-idx-card rounded-xl shadow-lg border border-slate-700 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-700">
                <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                    IDX Market Data
                </h2>

                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search Ticker (e.g., ADRO)..."
                        className="w-full bg-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-idx-accent transition-all"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1); // Reset to page 1 on search
                        }}
                    />
                </div>
            </div>

            <div className="overflow-y-auto flex-1">
                <table className="w-full text-left">
                    <thead className="bg-slate-700 sticky top-0 z-10">
                        <tr>
                            <th className="p-4 font-semibold text-sm text-gray-300">Ticker</th>
                            <th className="p-4 font-semibold text-sm text-gray-300">Price</th>
                            <th className="p-4 font-semibold text-sm text-gray-300 text-right">Change</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {stocks.map((stock) => (
                            <tr
                                key={stock.ticker}
                                onClick={() => onSelectStock(stock.ticker)}
                                className={`cursor-pointer transition-colors hover:bg-slate-700/50 ${selectedTicker === stock.ticker ? 'bg-slate-700/80 border-l-4 border-idx-accent' : ''}`}
                            >
                                <td className="p-4 py-3">
                                    <div className="font-bold text-white mb-0.5">{stock.ticker}</div>
                                    <div className="text-xs text-gray-400 truncate max-w-[120px]">{stock.name}</div>
                                </td>
                                <td className="p-4 py-3 text-white font-mono">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(stock.last_price)}
                                </td>
                                <td className={`p-4 py-3 text-right font-bold ${stock.change_percent >= 0 ? 'text-idx-up' : 'text-idx-down'}`}>
                                    <div className="flex items-center justify-end gap-1">
                                        {stock.change_percent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {stock.change_percent}%
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {stocks.length === 0 && (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-gray-400">
                                    No stocks found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
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
