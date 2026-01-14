import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStockHistory } from '../api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const StockChart = ({ ticker }) => {
    const { data: stockDetail, isLoading, error } = useQuery({
        queryKey: ['stock', ticker],
        queryFn: () => fetchStockHistory(ticker),
        enabled: !!ticker,
        refetchInterval: 60000, // Refresh logic every minute
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

    return (
        <div className="bg-idx-card rounded-xl shadow-lg border border-slate-700 p-6 h-full flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-white">{stockDetail.ticker}</h1>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {isPositive ? '+' : ''}{stockDetail.change_percent}%
                        </span>
                    </div>
                    <h2 className="text-gray-400 text-sm">{stockDetail.name}</h2>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-mono text-white font-semibold">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(stockDetail.last_price)}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">Last updated: Just now</div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[300px]">
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
                            tickFormatter={(val) => val.split('-').slice(1).join('/')}
                            minTickGap={30}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            tick={{ fontSize: 12 }}
                            domain={['auto', 'auto']}
                            tickFormatter={(val) => `Rp${val / 1000}k`}
                            width={60}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                            formatter={(value) => [new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value), 'Price']}
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
            </div>
        </div>
    );
};

export default StockChart;
