# Changelog

## Unreleased

### Added
- Market summary cards for loaded stocks, gainers, losers, and top volume.
- Stock detail metrics: open, high, low, previous close, and volume.
- Whale alert cards can open the selected ticker in Market Data.
- History cache with source visibility for chart data.
- Watchlist import/export as JSON.
- Search keyboard shortcuts: Enter selects first result, Esc clears search.
- Backend health visibility for cache coverage, worker status, and provider warnings.
- Technical indicators for stock details: MA20, MA50, RSI 14, and trend label.
- Smart watchlist metadata with notes, target prices, and alert thresholds.
- Provider diagnostics endpoint and dashboard panel for provider counters and skipped tickers.
- Stock detail insight cards explain trend, MA20 position, and RSI condition in plain language.
- Watchlist near-target UX adds table badges, filtering, and prioritizes target alerts on the board.
- Sector/category layer adds inferred sector classification, sector overview cards, and table sector filtering.
- Performance tuning adds query cache defaults, reduced chart polling, stable callbacks, and memoized chart/table components.
- Release readiness notes document public/debug modes, API endpoints, local validation, and known data limitations.

### Changed
- Backend models, cache state, and runtime config are split into dedicated modules.
- Frontend chart and whale alert screens are lazy-loaded for smaller initial bundles.
- README and Windows launcher now describe the current local development flow.
- Stock chart shows moving-average overlays and an indicator summary panel.
- Watchlist import/export now preserves metadata while staying compatible with legacy ticker arrays.
- Yahoo Chart and yfinance providers now record success/failure health signals.
- Public dashboard now shows simplified market data status, while technical diagnostics require `?debug=true`.
- Public dashboard hero, market status cards, summary cards, and table empty states are polished for a cleaner product feel.
- Environment examples now include clearer local-development guidance.

### Removed
- Legacy yfinance debug scripts that are replaced by provider modules and tests.
