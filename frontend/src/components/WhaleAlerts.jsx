import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWhaleAlerts } from '../api';
import { AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';

const WhaleAlerts = () => {
    const { data: alerts, isLoading, error } = useQuery({
        queryKey: ['whale-alerts'],
        queryFn: fetchWhaleAlerts,
        refetchInterval: 30000, // Refresh every 30s
    });

    return (
        <div className="min-h-screen bg-idx-dark text-idx-text p-6 font-sans">
            <header className="max-w-7xl mx-auto mb-8">
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center gap-3">
                    <AlertTriangle className="text-yellow-500" />
                    Whale Activity & High Volume Alerts
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    Detecting unusual buying pressure relative to 3-month average volume.
                    <span className="text-xs ml-2 bg-slate-800 px-2 py-0.5 rounded text-gray-500">Scanning top liquid stocks</span>
                </p>
            </header>

            <main className="max-w-7xl mx-auto">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-idx-card rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded-lg">
                        Failed to load whale alerts.
                    </div>
                ) : !alerts || alerts.length === 0 ? (
                    <div className="text-center py-20 bg-idx-card rounded-xl border border-dashed border-slate-700">
                        <BarChart2 className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-300">No Unusual Activity Detected</h3>
                        <p className="text-gray-500 mt-2">Market is currently behaving within normal volume parameters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {alerts.map((alert) => (
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
                                            <span>Vol: {(alert.volume / 1000000).toFixed(1)}M</span>
                                            <span>Avg: {(alert.avg_volume / 1000000).toFixed(1)}M</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${alert.signal.includes('Whale')
                                                ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50'
                                                : 'bg-green-900/30 text-green-400 border border-green-700/50'
                                            }`}>
                                            {alert.signal}
                                        </span>
                                    </div>
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
