import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchStockHistory, refreshStockHistory } from '../api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Line
} from 'recharts';

const PERIOD_OPTIONS = [
    { label: '5D', value: '5d' },
    { label: '1M', value: '1mo' },
    { label: '3M', value: '3mo' },
    { label: '6M', value: '6mo' },
    { label: '1Y', value: '1y' },
];

const REFRESH_OPTIONS = [
    { label: 'Manual', value: 0 },
    { label: '15s', value: 15000 },
    { label: '30s', value: 30000 },
    { label: '60s', value: 60000 },
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

    const pricePoint = payload.find((item) => item.dataKey === 'price') || payload[0];
    const price = pricePoint.value;
    const changeFromStart = firstPrice ? ((price - firstPrice) / firstPrice) * 100 : 0;
    const isPositive = changeFromStart >= 0;

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-xl">
            <div className="text-xs text-slate-400">{label}</div>
            <div className="mt-1 font-mono text-sm font-semibold text-white">{formatPrice(price)}</div>
            <div className="mt-2 space-y-1 text-xs text-slate-300">
                {payload.filter((item) => item.dataKey !== 'price').map((item) => (
                    <div key={item.dataKey} className="flex items-center justify-between gap-4">
                        <span style={{ color: item.color }}>{item.name}</span>
                        <span className="font-mono">{formatPrice(item.value)}</span>
                    </div>
                ))}
            </div>
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

const indicatorTone = (trendLabel) => ({
    Bullish: 'text-emerald-400 border-emerald-800/60 bg-emerald-950/20',
    Bearish: 'text-red-400 border-red-800/60 bg-red-950/20',
    Sideways: 'text-yellow-300 border-yellow-800/60 bg-yellow-950/20',
}[trendLabel] || 'text-slate-300 border-slate-700 bg-slate-800/50');

const getInsightTone = (tone) => ({
    positive: 'border-emerald-800/60 bg-emerald-950/20 text-emerald-200',
    warning: 'border-yellow-800/60 bg-yellow-950/20 text-yellow-100',
    negative: 'border-red-800/60 bg-red-950/20 text-red-100',
    neutral: 'border-slate-700 bg-slate-800/50 text-slate-200',
}[tone] || 'border-slate-700 bg-slate-800/50 text-slate-200');

const buildTechnicalInsights = (stockDetail, indicators) => {
    const insights = [];
    const lastPrice = stockDetail.last_price || 0;

    if (indicators.trend_label) {
        insights.push({
            title: `Trend saat ini ${indicators.trend_label}`,
            description: indicators.trend_label === 'Bullish'
                ? 'Harga berada dalam struktur naik berdasarkan moving average.'
                : indicators.trend_label === 'Bearish'
                    ? 'Harga berada dalam tekanan turun berdasarkan moving average.'
                    : indicators.trend_label === 'Sideways'
                        ? 'Harga masih bergerak campuran dan belum memberi arah kuat.'
                        : 'Data histori belum cukup untuk membaca trend kuat.',
            tone: indicators.trend_label === 'Bullish' ? 'positive' : indicators.trend_label === 'Bearish' ? 'negative' : 'neutral',
        });
    }

    if (indicators.ma20) {
        const isAboveMa20 = lastPrice >= indicators.ma20;
        insights.push({
            title: isAboveMa20 ? 'Harga di atas MA20' : 'Harga di bawah MA20',
            description: isAboveMa20 ? 'Momentum jangka pendek masih relatif kuat.' : 'Momentum jangka pendek perlu diwaspadai.',
            tone: isAboveMa20 ? 'positive' : 'warning',
        });
    }

    if (indicators.rsi14) {
        const rsiLabel = indicators.rsi14 >= 70 ? 'RSI overbought' : indicators.rsi14 <= 30 ? 'RSI oversold' : 'RSI neutral';
        insights.push({
            title: `${rsiLabel} (${indicators.rsi14.toFixed(2)})`,
            description: indicators.rsi14 >= 70
                ? 'Kenaikan sudah cukup panas; potensi koreksi perlu diperhatikan.'
                : indicators.rsi14 <= 30
                    ? 'Tekanan jual besar; pantau potensi rebound atau lanjutan turun.'
                    : 'Momentum belum ekstrem dan masih berada di area seimbang.',
            tone: indicators.rsi14 >= 70 ? 'warning' : indicators.rsi14 <= 30 ? 'negative' : 'neutral',
        });
    }

    return insights.slice(0, 3);
};

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

const getDataQuality = (source, updatedAt) => {
    const ageSeconds = updatedAt ? (Date.now() - new Date(updatedAt).getTime()) / 1000 : null;
    if (source === 'yahoo_chart' && ageSeconds !== null && ageSeconds <= 120) return { label: 'Live-ish', tone: 'text-emerald-300 border-emerald-800/60 bg-emerald-950/20' };
    if (source === 'history_cache') return { label: 'From cache', tone: 'text-blue-300 border-blue-800/60 bg-blue-950/20' };
    if (source === 'stale_history_cache') return { label: 'Delayed', tone: 'text-yellow-300 border-yellow-800/60 bg-yellow-950/20' };
    if (source === 'yfinance_fallback' || source === 'price_cache') return { label: 'Provider fallback', tone: 'text-yellow-300 border-yellow-800/60 bg-yellow-950/20' };
    return { label: 'Data pending', tone: 'text-slate-300 border-slate-700 bg-slate-800/50' };
};

const StockChart = ({ ticker, defaultPeriod = '1mo', compactMode = false, autoRefresh = true, refreshInterval = 60000 }) => {
    const [period, setPeriod] = useState(defaultPeriod);
    const [chartRefreshInterval, setChartRefreshInterval] = useState(autoRefresh ? Math.max(refreshInterval, 60000) : 0);
    const queryClient = useQueryClient();

    useEffect(() => {
        setPeriod(defaultPeriod);
    }, [defaultPeriod]);
    const { data: stockDetail, isLoading, isFetching, error } = useQuery({
        queryKey: ['stock', ticker, period],
        queryFn: () => fetchStockHistory(ticker, period),
        enabled: !!ticker,
        refetchInterval: chartRefreshInterval || false,
    });
    const refreshMutation = useMutation({
        mutationFn: () => refreshStockHistory(ticker, period),
        onSuccess: (data) => queryClient.setQueryData(['stock', ticker, period], data),
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
    const indicators = stockDetail.technical_indicators || {};
    const technicalInsights = buildTechnicalInsights(stockDetail, indicators);
    const dataQuality = getDataQuality(stockDetail.data_source, stockDetail.last_updated_at);

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
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <select
                            value={chartRefreshInterval}
                            onChange={(event) => setChartRefreshInterval(Number(event.target.value))}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-idx-accent"
                            aria-label="Chart refresh interval"
                        >
                            {REFRESH_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <button
                            type="button"
                            onClick={() => refreshMutation.mutate()}
                            disabled={refreshMutation.isPending}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {refreshMutation.isPending ? 'Refreshing...' : 'Refresh now'}
                        </button>
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
                    <div className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${dataQuality.tone}`}>
                        {dataQuality.label}
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

            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className={`rounded-lg border p-3 ${indicatorTone(indicators.trend_label)}`}>
                    <div className="text-[11px] uppercase tracking-wide opacity-70">Trend</div>
                    <div className="mt-1 text-sm font-bold">{indicators.trend_label || 'Unknown'}</div>
                </div>
                <MetricCard label="MA20" value={indicators.ma20 ? formatPrice(indicators.ma20) : '-'} />
                <MetricCard label="MA50" value={indicators.ma50 ? formatPrice(indicators.ma50) : '-'} />
                <MetricCard label="RSI 14" value={indicators.rsi14 ? indicators.rsi14.toFixed(2) : '-'} />
            </div>

            {technicalInsights.length > 0 && (
                <div className="mb-5 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-bold text-white">Insight Teknis</div>
                            <div className="text-xs text-slate-500">Ringkasan otomatis dari trend, moving average, dan RSI.</div>
                        </div>
                        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">Beta</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {technicalInsights.map((insight) => (
                            <div key={insight.title} className={`rounded-xl border p-3 ${getInsightTone(insight.tone)}`}>
                                <div className="text-sm font-semibold">{insight.title}</div>
                                <p className="mt-1 text-xs leading-relaxed opacity-80">{insight.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {stockDetail.sentiment && (
                <div className="mb-5 rounded-2xl border border-slate-800 bg-idx-card p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-bold text-white">Sentimen Publik & Berita</div>
                            <div className="text-xs text-slate-500">Klasifikasi sentimen berbasis artikel berita terbaru.</div>
                        </div>
                        <span className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-400 font-bold">Sentimen</span>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-full md:w-1/3 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                            <span className={`text-3xl font-black tracking-wider ${
                                stockDetail.sentiment.label === 'BULLISH' ? 'text-emerald-400' :
                                stockDetail.sentiment.label === 'BEARISH' ? 'text-rose-400' : 'text-yellow-400'
                            }`}>
                                {stockDetail.sentiment.label}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1 font-semibold">({stockDetail.sentiment.total_articles} Berita Terkait)</span>
                        </div>
                        <div className="flex-1 w-full space-y-3">
                            <div className="flex justify-between text-xs font-semibold">
                                <span className="text-rose-400/80">Bearish</span>
                                <span className="text-indigo-300 font-bold">{stockDetail.sentiment.score_percent}% Bullish</span>
                                <span className="text-emerald-400/80">Bullish</span>
                            </div>
                            <div className="relative w-full h-2 bg-slate-950 rounded-full overflow-visible flex border border-slate-800/80">
                                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/60 via-slate-700 to-emerald-500/60 rounded-full"></div>
                                <div 
                                    className="absolute w-1.5 h-3.5 bg-white rounded-full shadow shadow-black -top-[3px] -translate-x-1/2 transition-all duration-500" 
                                    style={{ left: `${stockDetail.sentiment.score_percent}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                                <span>🔴 {stockDetail.sentiment.breakdown.negative} Bearish</span>
                                <span>⚪ {stockDetail.sentiment.breakdown.neutral} Netral</span>
                                <span>🟢 {stockDetail.sentiment.breakdown.positive} Bullish</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                name="Price"
                                stroke={color}
                                fillOpacity={1}
                                fill="url(#colorPrice)"
                                strokeWidth={2}
                            />
                            <Line type="monotone" dataKey="ma20" name="MA20" stroke="#38bdf8" strokeWidth={1.5} dot={false} connectNulls />
                            <Line type="monotone" dataKey="ma50" name="MA50" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default React.memo(StockChart);
