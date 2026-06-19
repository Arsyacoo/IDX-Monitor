import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWhaleAlerts } from '../api';
import { AlertTriangle, TrendingUp, BarChart2, RefreshCw, SlidersHorizontal } from 'lucide-react';

const formatMillions = (value) => `${((value || 0) / 1000000).toFixed(1)}M`;

const WhaleAlerts = () => {
    const [minRatio, setMinRatio] = useState(1.2);
    const [signalFilter, setSignalFilter] = useState('all');
    const [sortBy, setSortBy] = useState('ratio-desc');

    const { data: alerts = [], isLoading, isFetching, error, dataUpdatedAt, refetch } = useQuery({
        queryKey: ['whaleAlerts'],
        queryFn: fetchWhaleAlerts,
        refetchInterval: 30000,
    });

    const filteredAlerts = useMemo(() => {
        return alerts
            .filter((alert) => alert.volume_ratio >= minRatio)
            .filter((alert) => {
                if (signalFilter === 'whale') return alert.signal.toLowerCase().includes('whale');
                if (signalFilter === 'pressure') return alert.signal.toLowerCase().includes('pressure');
                if (signalFilter === 'volume') return alert.signal.toLowerCase().includes('volume');
                return true;
            })
            .sort((firstAlert, secondAlert) => {
                if (sortBy === 'change-desc') return secondAlert.change_percent - firstAlert.change_percent;
                if (sortBy === 'volume-desc') return secondAlert.volume - firstAlert.volume;
                return secondAlert.volume_ratio - firstAlert.volume_ratio;
            });
    }, [alerts, minRatio, signalFilter, sortBy]);

    const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID') : '-';

    return (
        <div className="p-6 min-h-screen bg-idx-dark text-idx-text">
            <header className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                                <AlertTriangle size={28} />
                            </div>
                            <h1 className="text-3xl font-bold text-white">Whale Activity Radar</h1>
                        </div>
                        <p className="text-slate-400">Detecting unusual volume spikes and potential accumulation patterns.</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">Updated {lastUpdated}</span>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300 hover:text-white"
                        >
                            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-700 bg-idx-card p-4 md:grid-cols-3">
                    <label className="text-sm text-slate-300">
                        <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500"><SlidersHorizontal size={14} /> Min Ratio</span>
                        <select value={minRatio} onChange={(event) => setMinRatio(Number(event.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200">
                            <option value={1.2}>1.2x+</option>
                            <option value={1.5}>1.5x+</option>
                            <option value={2}>2.0x+</option>
                            <option value={3}>3.0x+</option>
                        </select>
                    </label>
                    <label className="text-sm text-slate-300">
                        <span className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Signal</span>
                        <select value={signalFilter} onChange={(event) => setSignalFilter(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200">
                            <option value="all">All signals</option>
                            <option value="whale">Whale accumulation</option>
                            <option value="pressure">Buying pressure</option>
                            <option value="volume">High volume</option>
                        </select>
                    </label>
                    <label className="text-sm text-slate-300">
                        <span className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Sort</span>
                        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200">
                            <option value="ratio-desc">Volume ratio</option>
                            <option value="change-desc">Price change</option>
                            <option value="volume-desc">Raw volume</option>
                        </select>
                    </label>
                </div>
            </header>

            <main className="max-w-7xl mx-auto">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="h-44 bg-idx-card rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded-lg">
                        Failed to load whale alerts.
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="text-center py-20 bg-idx-card rounded-xl border border-dashed border-slate-700">
                        <BarChart2 className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-300">No Activity For This Filter</h3>
                        <p className="text-gray-500 mt-2">Lower the threshold or reset filters to see more market activity.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAlerts.map((alert) => (
                            <div key={alert.ticker} className="bg-idx-card rounded-xl p-6 border border-slate-700 shadow-lg relative overflow-hidden group hover:border-idx-accent transition-colors">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <TrendingUp size={80} />
                                </div>

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">{alert.ticker}</h3>
                                        <p className="text-xs text-gray-400 truncate w-48">{alert.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-mono font-semibold text-idx-up">
                                            +{alert.change_percent}%
                                        </div>
                                        <div className="text-xs text-gray-500">Price Change</div>
                                    </div>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Volume Ratio</span>
                                            <span className={`font-bold ${alert.volume_ratio > 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                {alert.volume_ratio}x Avg
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${alert.volume_ratio > 2 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                style={{ width: `${Math.min(alert.volume_ratio * 30, 100)}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs mt-2 text-gray-500">
                                            <span>Vol: {formatMillions(alert.volume)}</span>
                                            <span>Avg: {formatMillions(alert.avg_volume)}</span>
                                        </div>
                                    </div>

                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${alert.signal.includes('Whale')
                                        ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50'
                                        : 'bg-green-900/30 text-green-400 border border-green-700/50'
                                        }`}>
                                        {alert.signal}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default WhaleAlerts;
