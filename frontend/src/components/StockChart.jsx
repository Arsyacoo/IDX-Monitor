import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStockHistory } from '../api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
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

const formatVolume = (value) => new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: 1,
}).format(value || 0);

const ChartTooltip = ({ active, payload, label, firstPrice }) => {
    if (!active || !payload?.length) return null;

    const price = payload[0].value;
    const changeFromStart = firstPrice ? ((price - firstPrice) / firstPrice) * 100 : 0;
    const isPositive = changeFromStart >= 0;

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-xl">
            <div className="text-xs text-slate-400">{label}</div>
            <div className="mt-1 font-mono text-sm font-semibold text-white">{formatPrice(price)}</div>
            <div className={`mt-1 text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{changeFromStart.toFixed(2)}% vs start
            </div>
        </div>
    );
};

const MetricCard = ({ label, value }) => (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-1 font-mono text-sm font-semibold text-slate-100">{value}</div>
    </div>
);

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

const StockChart = ({ ticker, defaultPeriod = '1mo', compactMode = false }) => {
    const [period, setPeriod] = useState(defaultPeriod);

    useEffect(() => {
        setPeriod(defaultPeriod);
    }, [defaultPeriod]);
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
    const firstHistoryPrice = hasHistory ? stockDetail.history[0].price : 0;
    const periodHigh = hasHistory ? Math.max(...stockDetail.history.map((point) => point.price)) : 0;
    const periodLow = hasHistory ? Math.min(...stockDetail.history.map((point) => point.price)) : 0;
    const periodChange = firstHistoryPrice ? ((stockDetail.last_price - firstHistoryPrice) / firstHistoryPrice) * 100 : 0;

    return (
        <div className={`bg-idx-card rounded-xl shadow-lg border border-slate-700 ${compactMode ? 'p-4' : 'p-6'} h-full flex flex-col`}>
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:justify-between xl:items-end">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-white">{stockDetail.ticker}</h1>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {isPositive ? '+' : ''}{stockDetail.change_percent}%
                        </span>
                    </div>
                    <h2 className="text-gray-400 text-sm">{stockDetail.name}</h2>
                    {hasHistory && (
                        <p className={`mt-2 text-sm font-semibold ${periodChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {periodChange >= 0 ? '+' : ''}{periodChange.toFixed(2)}% over selected period
                        </p>
                    )}
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

            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
                <MetricCard label="Open" value={formatPrice(stockDetail.open)} />
                <MetricCard label="High" value={formatPrice(stockDetail.high)} />
                <MetricCard label="Low" value={formatPrice(stockDetail.low)} />
                <MetricCard label="Prev Close" value={formatPrice(stockDetail.previous_close)} />
                <MetricCard label="Volume" value={formatVolume(stockDetail.volume)} />
            </div>

            <div className="flex-1 w-full min-h-[260px] relative">
                {isFetching && (
                    <div className="absolute right-3 top-3 z-10 rounded-full bg-slate-900/80 px-3 py-1 text-xs text-idx-accent border border-slate-700">
                        Updating
                    </div>
                )}
                {!hasHistory ? (
                    <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
                        <div>
                            <div className="text-base font-semibold text-slate-200">Historical chart is warming up</div>
                            <p className="mt-2 max-w-md text-sm">
                                No price history is available for {ticker} in the {stockDetail.period.toUpperCase()} period yet. Current source: {formatDataSource(stockDetail.data_source)}.
                            </p>
                            <p className="mt-1 text-xs text-slate-500">Try another period or wait until the backend provider refresh finishes.</p>
                        </div>
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
                            <Tooltip content={<ChartTooltip firstPrice={firstHistoryPrice} />} />
                            <ReferenceLine y={periodHigh} stroke="#22c55e" strokeDasharray="4 4" ifOverflow="extendDomain" />
                            <ReferenceLine y={periodLow} stroke="#ef4444" strokeDasharray="4 4" ifOverflow="extendDomain" />
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
