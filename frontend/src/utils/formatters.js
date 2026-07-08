/**
 * Format a number as IDR currency with no decimals.
 * @param {number} value
 * @returns {string}
 */
export const formatPrice = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);

/**
 * Format a volume number with B/M/K suffixes.
 * @param {number} value
 * @returns {string}
 */
export const formatVolume = (value) => {
  const num = Number(value) || 0;
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
};

/**
 * Format a number in compact notation (Intl).
 * @param {number} value
 * @returns {string}
 */
export const formatCompact = (value) =>
  new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);

/**
 * Format a timestamp for the health banner, or return 'Not yet'.
 * @param {string|null} value
 * @returns {string}
 */
export const formatHealthTime = (value) => {
  if (!value) return 'Not yet';
  return new Date(value).toLocaleTimeString('id-ID');
};
