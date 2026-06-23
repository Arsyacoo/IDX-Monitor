# Changelog

## Unreleased

### Added
- Market summary cards for loaded stocks, gainers, losers, and top volume.
- Stock detail metrics: open, high, low, previous close, and volume.
- Whale alert cards can open the selected ticker in Market Data.
- History cache with source visibility for chart data.
- Watchlist import/export as JSON.
- Search keyboard shortcuts: Enter selects first result, Esc clears search.

### Changed
- Backend models, cache state, and runtime config are split into dedicated modules.
- Frontend chart and whale alert screens are lazy-loaded for smaller initial bundles.
