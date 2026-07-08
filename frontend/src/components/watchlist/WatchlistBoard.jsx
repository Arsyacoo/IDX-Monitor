import React from 'react';
import { formatCompact } from '../../utils/formatters';
import { getTargetStatus, getPortfolioPosition } from '../../utils/watchlistHelpers';

const WatchlistBoard = ({ stocks, watchlist, onOpenTicker, onUpdateWatchlistItem }) => {
  if (watchlist.length === 0) return null;

  const enrichedWatchlist = watchlist.map((item) => {
    const stock = stocks.find((stockItem) => stockItem.ticker === item.ticker);
    const targetStatus = getTargetStatus(stock, item);
    const portfolioPosition = getPortfolioPosition(stock, item);
    return { item, stock, targetStatus, portfolioPosition };
  }).sort((firstItem, secondItem) => {
    if (firstItem.targetStatus?.isNearTarget && !secondItem.targetStatus?.isNearTarget) return -1;
    if (!firstItem.targetStatus?.isNearTarget && secondItem.targetStatus?.isNearTarget) return 1;
    return Math.abs(firstItem.targetStatus?.distancePercent ?? 999) - Math.abs(secondItem.targetStatus?.distancePercent ?? 999);
  });

  return (
    <section className="max-w-7xl mx-auto mb-6 rounded-xl border border-slate-700 bg-idx-card p-4" aria-label="Watchlist board">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-white">Watchlist Board</h2>
          <p className="text-xs text-slate-400">Quick access, notes, target prices, and alert thresholds.</p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{watchlist.length} saved</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {enrichedWatchlist.slice(0, 8).map(({ item, stock, targetStatus, portfolioPosition }) => {
          return (
            <div key={item.ticker} className={`rounded-lg border bg-slate-800/70 p-3 transition-colors ${targetStatus?.isNearTarget ? 'border-yellow-500/70' : 'border-slate-700'}`}>
              <button type="button" onClick={() => onOpenTicker(item.ticker)} className="w-full text-left focus:outline-none focus:ring-2 focus:ring-idx-accent rounded-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-white">{item.ticker}</div>
                    <div className="mt-1 truncate text-xs text-slate-400">{stock?.name || 'Open ticker chart'}</div>
                  </div>
                  {targetStatus?.isNearTarget && <span className="rounded-full border border-yellow-500/50 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-300">Alert</span>}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-mono text-slate-200">{stock ? formatCompact(stock.last_price) : '-'}</span>
                  <span className={stock?.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}>{stock ? `${stock.change_percent}%` : 'Open'}</span>
                </div>
              </button>
              <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
                <input
                  type="text"
                  value={item.note}
                  onChange={(event) => onUpdateWatchlistItem(item.ticker, { note: event.target.value })}
                  placeholder="Add note..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={item.targetPrice}
                    onChange={(event) => onUpdateWatchlistItem(item.ticker, { targetPrice: event.target.value })}
                    placeholder="Target price"
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500"
                  />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={item.alertThreshold}
                    onChange={(event) => onUpdateWatchlistItem(item.ticker, { alertThreshold: event.target.value })}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
                    aria-label={`${item.ticker} alert threshold percentage`}
                  />
                </div>
                <div className={`text-xs ${targetStatus?.isNearTarget ? 'text-yellow-300' : 'text-slate-500'}`}>
                  {targetStatus ? targetStatus.label : 'Set target price to enable alert'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={item.lots}
                    onChange={(event) => onUpdateWatchlistItem(item.ticker, { lots: event.target.value })}
                    placeholder="Lots"
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500"
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.averagePrice}
                    onChange={(event) => onUpdateWatchlistItem(item.ticker, { averagePrice: event.target.value })}
                    placeholder="Avg price"
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                {portfolioPosition ? (
                  <div className="rounded-md border border-slate-700 bg-slate-900 p-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Market value</span>
                      <span className="font-mono text-slate-200">{formatCompact(portfolioPosition.marketValue)}</span>
                    </div>
                    <div className={`mt-1 flex justify-between font-semibold ${portfolioPosition.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      <span>Unrealized P/L</span>
                      <span>{portfolioPosition.unrealizedPnL >= 0 ? '+' : ''}{formatCompact(portfolioPosition.unrealizedPnL)} ({portfolioPosition.unrealizedPnLPercent.toFixed(2)}%)</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Isi lots dan avg price untuk aktifkan portfolio P/L.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default WatchlistBoard;
