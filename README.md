# IDX Monitor

**IDX Monitor** adalah dashboard pemantauan saham Indonesia (IDX) untuk melihat harga terkini, grafik historis, ringkasan pasar, sektor, watchlist target, indikator teknikal, dan deteksi aktivitas volume tidak biasa atau *whale alerts*.

## Fitur Utama

- **Market Dashboard**: daftar emiten IDX dengan harga terakhir, perubahan harga, volume, pencarian, pagination, sorting, filter sektor, dan filter watchlist.
- **Interactive Chart**: grafik historis per ticker dengan periode `5D`, `1M`, `3M`, `6M`, dan `1Y`, manual refresh, interval polling, dan label kualitas data.
- **Technical Insights**: MA20, MA50, RSI 14, trend label, dan insight otomatis yang mudah dibaca.
- **Sector Overview**: klasifikasi sektor berbasis nama emiten, ringkasan volume, rata-rata perubahan, gainers, dan losers.
- **Whale Alerts**: deteksi lonjakan volume dan perubahan harga untuk membantu menemukan pergerakan pasar yang tidak biasa.
- **Smart Watchlist & Portfolio**: simpan ticker favorit, note, target price, alert threshold, lots, average price, badge `Near Target`, unrealized P/L, serta import/export JSON.
- **Public Market Status**: status data publik yang sederhana seperti `Data sedang diperbarui`, `Terakhir diperbarui`, dan `Market data healthy`.
- **Debug Diagnostics**: diagnostics teknis provider dan cache tersedia hanya lewat `?debug=true`.

## Teknologi

### Frontend
- React + Vite
- TanStack Query
- Recharts
- Lucide React
- Tailwind CSS/PostCSS

### Backend
- FastAPI
- yfinance
- Yahoo Chart API provider
- Pydantic
- Pytest

## Prasyarat

Pastikan sudah tersedia:

- Node.js 20+ atau versi LTS terbaru
- Python 3.10+
- Git

## Menjalankan Project

### Cara Cepat Windows

Klik dua kali `run_app.bat` dari folder root project. Script akan membuka dua terminal:

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`
- API Docs: `http://localhost:8000/docs`

### Cara Manual

Backend:

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Lalu buka `http://localhost:5173` di browser.

## Mode Publik dan Debug

Dashboard publik hanya menampilkan status data yang ramah pengguna:

- `Data sedang diperbarui`
- `Terakhir diperbarui`
- `Sebagian data mungkin tertunda`
- `Market data healthy`

Panel teknis seperti provider counters, skipped tickers, cache coverage detail, dan worker batch disembunyikan dari publik. Untuk membuka diagnostics teknis, gunakan:

```text
http://localhost:5173/?debug=true
```

## Konfigurasi Environment

Backend membaca konfigurasi dari environment variable berikut. Contoh tersedia di `backend/.env.example`.

| Variable | Default | Fungsi |
| --- | --- | --- |
| `CORS_ORIGINS` | `*` | Origin frontend yang diizinkan mengakses API. |
| `PRICE_BATCH_SIZE` | `50` | Jumlah ticker yang diproses per batch worker. |
| `PRICE_BATCH_DELAY_SECONDS` | `2` | Delay antar batch worker. |
| `PRICE_REFRESH_INTERVAL_SECONDS` | `60` | Interval refresh harga background worker. |
| `HISTORY_CACHE_TTL_SECONDS` | `600` | Masa berlaku cache histori chart. |
| `YAHOO_CHART_URL` | Yahoo Chart endpoint | Endpoint chart Yahoo Finance. |
| `UNAVAILABLE_TICKER_TTL_SECONDS` | `3600` | Durasi skip ticker yang gagal dari provider. |
| `EXTERNAL_REQUEST_RETRIES` | `2` | Jumlah retry request ke provider eksternal. |
| `EXTERNAL_REQUEST_BACKOFF_SECONDS` | `1` | Delay awal exponential backoff provider. |

Frontend membaca `VITE_API_BASE_URL` dari `frontend/.env.example`.

## Endpoint Utama

- `GET /api/health` — status ringkas backend dan worker.
- `GET /api/status/providers` — diagnostics provider untuk debug mode.
- `GET /api/stocks` — daftar saham dengan pagination dan search.
- `GET /api/stock/{ticker}` — detail saham, history, metrics, dan technical indicators.
- `GET /api/market-summary` — market summary dari cache harga.
- `GET /api/whale-alerts` — daftar whale alerts.

## Validasi Lokal

Backend:

```bash
cd backend
python -m pytest -q
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Struktur Project

```text
backend/
  routes/              # API routes FastAPI
  services/            # business logic, market data, indicators, whale detector
  services/providers/  # Yahoo/yfinance provider + retry helper
  tests/               # test backend
frontend/
  src/components/      # UI dashboard, chart, whale alerts, table
  src/api.js           # API client frontend
run_app.bat            # launcher lokal Windows
```

## Catatan dan Batasan Data

- Data harga dan histori bergantung pada provider eksternal, sehingga beberapa ticker dapat terlambat atau sementara tidak tersedia.
- Klasifikasi sektor menggunakan mapping eksplisit backend untuk ticker utama dan fallback rule terpusat untuk emiten lain; tetap bukan data sektor resmi IDX.
- Technical indicators bersifat informatif dan bukan rekomendasi beli/jual.
- Watchlist disimpan di localStorage browser, sehingga data berbeda antar perangkat/browser.
- Background worker membutuhkan waktu untuk mengisi cache semua ticker saat aplikasi baru dinyalakan.

## Checklist Rilis Lokal

Sebelum membagikan project atau mengambil screenshot terbaru:

- Jalankan backend dan frontend.
- Tunggu cache mulai terisi di dashboard.
- Uji pencarian ticker dan chart.
- Tambahkan ticker ke watchlist dan isi target price.
- Cek filter `Near Target` dan filter sektor.
- Buka `?debug=true` hanya untuk validasi diagnostics teknis.
- Jalankan `python -m pytest -q`, `npm run lint`, dan `npm run build`.

---

Dibuat oleh [Arsyacoo](https://github.com/Arsyacoo).


