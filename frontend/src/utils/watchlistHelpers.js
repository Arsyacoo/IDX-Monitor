export const WATCHLIST_STORAGE_KEY = 'idx-monitor-watchlist';
export const SETTINGS_STORAGE_KEY = 'idx-monitor-settings';

export const DEFAULT_SETTINGS = {
  autoRefresh: true,
  refreshInterval: 10000,
  defaultChartPeriod: '1mo',
  defaultTableSort: 'ticker',
  compactMode: false,
};

/**
 * Normalize a single watchlist item (string ticker or object).
 * @param {string|object} item
 * @returns {object}
 */
export const normalizeWatchlistItem = (item) => {
  if (typeof item === 'string') {
    return {
      ticker: item.trim().toUpperCase(),
      note: '',
      targetPrice: '',
      alertThreshold: 5,
      lots: '',
      averagePrice: '',
    };
  }

  return {
    ticker: String(item?.ticker || '').trim().toUpperCase(),
    note: String(item?.note || ''),
    targetPrice: item?.targetPrice ?? '',
    alertThreshold: Number(item?.alertThreshold ?? 5),
    lots: item?.lots ?? '',
    averagePrice: item?.averagePrice ?? '',
  };
};

/**
 * Normalize an array of watchlist items, deduplicate by ticker.
 * @param {Array} items
 * @returns {Array}
 */
export const normalizeWatchlist = (items) => {
  if (!Array.isArray(items)) return [];
  const normalizedItems = items.map(normalizeWatchlistItem).filter((item) => item.ticker);
  return [...new Map(normalizedItems.map((item) => [item.ticker, item])).values()];
};

/**
 * Calculate how close a stock is to the watchlist target price.
 * @param {object|null} stock
 * @param {object} item - watchlist item
 * @returns {object|null}
 */
export const getTargetStatus = (stock, item) => {
  const targetPrice = Number(item.targetPrice);
  if (!stock || !targetPrice) return null;

  const distancePercent = ((targetPrice - stock.last_price) / stock.last_price) * 100;
  const threshold = Number(item.alertThreshold || 5);
  const isNearTarget = Math.abs(distancePercent) <= threshold;

  return {
    distancePercent,
    isNearTarget,
    label: isNearTarget ? 'Near target' : `${distancePercent > 0 ? '+' : ''}${distancePercent.toFixed(1)}% to target`,
  };
};

/**
 * Calculate portfolio position metrics for a watchlist item.
 * @param {object|null} stock
 * @param {object} item - watchlist item
 * @returns {object|null}
 */
export const getPortfolioPosition = (stock, item) => {
  const lots = Number(item.lots || 0);
  const averagePrice = Number(item.averagePrice || 0);
  const lastPrice = Number(stock?.last_price || 0);
  if (!lots || !averagePrice || !lastPrice) return null;

  const shares = lots * 100;
  const investedValue = shares * averagePrice;
  const marketValue = shares * lastPrice;
  const unrealizedPnL = marketValue - investedValue;
  const unrealizedPnLPercent = investedValue ? (unrealizedPnL / investedValue) * 100 : 0;

  return {
    lots,
    averagePrice,
    shares,
    investedValue,
    marketValue,
    unrealizedPnL,
    unrealizedPnLPercent,
  };
};
