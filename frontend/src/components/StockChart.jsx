import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStockHistory } from '../api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const PERIOD_OPTIONS = [
    { label: '5D', value: '5d' },
    { label: '1M', value: '1mo' },
    { label: '3M', value: '3mo' },
    { label: '6M', value: '6mo' },
    { label: '1Y', value: '1y' },
];

const formatPrice = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(value || 0);

const formatDataSource = (source) => ({
    yahoo_chart: 'Yahoo Chart API',
    history_cache: 'History Cache',
    stale_history_cache: 'Stale Cache',
    yfinance_fallback: 'yfinance Fallback',
    price_cache: 'Price Cache',
    unavailable: 'Unavailable',
}[source] || source || 'Unknown');

const formatUpdatedAt = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString('id-ID');
};

const StockChart = ({ ticker }) => {
    const [period, setPeriod] = useState('1mo');
    const { data: stockDetail, isLoading, isFetching, error } = useQuery({
        queryKey: ['stock', ticker, period],
        queryFn: () => fetchStockHistory(ticker, period),
        enabled: !!ticker,
        refetchInterval: 60000,
    });

    if (!ticker) {
        return (
            <div className="bg-idx-card rounded-xl shadow-lg border border-slate-700 h-full flex items-center justify-center text-gray-400 p-8">
                <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">Select a Stock</h3>
                    <p>Click on a ticker from the list to view its performance.</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="bg-idx-card rounded-xl shadow-lg border border-slate-700 h-full flex items-center justify-center">
                <div className="animate-pulse text-idx-accent font-semibold">Loading data for {ticker}...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-idx-card rounded-xl shadow-lg border border-slate-700 h-full flex items-center justify-center text-idx-down">
                Error loading data for {ticker}
            </div>
        );
    }

    const isPositive = stockDetail.change_percent >= 0;
    const color = isPositive ? '#10b981' : '#ef4444';
    const hasHistory = stockDetail.history && stockDetail.history.length > 0;

    return (
        <div className="bg-idx-card rounded-xl shadow-lg border border-slate-700 p-6 h-full flex flex-col">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:justify-between xl:items-end">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-white">{stockDetail.ticker}</h1>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {isPositive ? '+' : ''}{stockDetail.change_percent}%
                        </span>
                    </div>
                    <h2 className="text-gray-400 text-sm">{stockDetail.name}</h2>
                    <div className="mt-3 flex gap-1 bg-slate-800 p-1 rounded-lg w-fit">
                        {PERIOD_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setPeriod(option.value)}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${period === option.value ? 'bg-idx-accent text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="text-left xl:text-right">
                    <div className="text-3xl font-mono text-white font-semibold">
                        {formatPrice(stockDetail.last_price)}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                        {isFetching ? 'Refreshing chart...' : `Period: ${stockDetail.period.toUpperCase()}`}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">
                        Source: {formatDataSource(stockDetail.data_source)}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">
                        Data updated: {formatUpdatedAt(stockDetail.last_updated_at)}
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[300px] relative">
                {isFetching && (
                    <div className="absolute right-3 top-3 z-10 rounded-full bg-slate-900/80 px-3 py-1 text-xs text-idx-accent border border-slate-700">
                        Updating
                    </div>
                )}
                {!hasHistory ? (
                    <div className="h-full flex items-center justify-center text-slate-400 border border-dashed border-slate-700 rounded-xl">
                        No historical data available for this period. Data source: {formatDataSource(stockDetail.data_source)}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stockDetail.history}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#94a3b8"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => value.split('-').slice(1).join('/')}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                tick={{ fontSize: 12 }}
                                domain={['auto', 'auto']}
                                tickFormatter={(value) => `Rp${value / 1000}k`}
                                width={60}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                                formatter={(value) => [formatPrice(value), 'Price']}
                                labelStyle={{ color: '#94a3b8' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="price"
                                stroke={color}
                                fillOpacity={1}
                                fill="url(#colorPrice)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default StockChart;
