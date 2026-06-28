# IDX Monitor

**IDX Monitor** adalah dashboard pemantauan saham Indonesia (IDX) untuk melihat harga terkini, grafik historis, ringkasan pasar, watchlist, dan deteksi aktivitas volume tidak biasa atau *whale alerts*.

## Fitur Utama

- **Market Dashboard**: daftar emiten IDX dengan harga terakhir, perubahan harga, volume, pencarian, pagination, dan sorting.
- **Interactive Chart**: grafik historis per ticker dengan pilihan periode `5D`, `1M`, `3M`, `6M`, dan `1Y`.
- **Backend Health Banner**: status cache, worker background, coverage data, unavailable ticker, dan provider warning langsung dari dashboard.
- **Whale Alerts**: deteksi lonjakan volume dan perubahan harga untuk membantu menemukan pergerakan pasar yang tidak biasa.
- **Watchlist Lokal**: simpan ticker favorit di browser, termasuk import/export JSON.
- **Dashboard Settings**: pengaturan auto-refresh, default periode chart, sort tabel, dan compact mode.

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

### Cara Manual

Backend:

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Lalu buka `http://localhost:5173` di browser.

## Konfigurasi Environment

Backend membaca konfigurasi dari environment variable berikut. Contoh tersedia di `backend/.env.example`.

| Variable | Default | Fungsi |
| --- | --- | --- |
| `CORS_ORIGINS` | `*` | Origin frontend yang diizinkan mengakses API. |
| `PRICE_BATCH_SIZE` | `50` | Jumlah ticker yang diproses per batch worker. |
| `PRICE_BATCH_DELAY_SECONDS` | `2` | Delay antar batch worker. |
| `PRICE_REFRESH_INTERVAL_SECONDS` | `60` | Interval refresh harga background worker. |
| `HISTORY_CACHE_TTL_SECONDS` | `600` | Masa berlaku cache histori chart. |
| `UNAVAILABLE_TICKER_TTL_SECONDS` | `3600` | Durasi skip ticker yang gagal dari provider. |
| `EXTERNAL_REQUEST_RETRIES` | `2` | Jumlah retry request ke provider eksternal. |
| `EXTERNAL_REQUEST_BACKOFF_SECONDS` | `1` | Delay awal exponential backoff provider. |

Frontend membaca `VITE_API_BASE_URL` dari `frontend/.env.example`.

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
  services/            # business logic dan data provider
  services/providers/  # Yahoo/yfinance provider + retry helper
  tests/               # test backend
frontend/
  src/components/      # UI dashboard, chart, whale alerts
  src/api.js           # API client frontend
run_app.bat            # launcher lokal Windows
```

## Catatan Data

Data harga dan histori bergantung pada provider eksternal. Jika chart belum muncul, cek **Backend Data Health** di dashboard untuk melihat status worker, cache coverage, ticker yang sedang diproses, dan warning provider terakhir.

---

Dibuat oleh [Arsyacoo](https://github.com/Arsyacoo).
