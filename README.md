# IDX Monitor

**IDX Monitor** adalah dashboard real-time untuk memantau saham Indonesia (IDX) dengan market data, watchlist, chart interval, dan whale activity radar.

## Fitur Utama

- **Market Data Real-Time**: Harga, persentase perubahan, volume, filter, sorting, dan auto-refresh.
- **Watchlist Lokal**: Simpan saham favorit di browser menggunakan `localStorage`.
- **Chart Interaktif**: Interval `5D`, `1M`, `3M`, `6M`, dan `1Y`.
- **Whale Alerts**: Filter threshold volume ratio, signal, sorting, dan manual refresh.
- **Health API**: Endpoint `/api/health` untuk memantau cache backend.
- **CI Ready**: GitHub Actions untuk test backend, lint frontend, dan build frontend.

## Teknologi

### Frontend
- React + Vite
- Tailwind CSS
- TanStack Query
- Recharts
- Lucide React

### Backend
- FastAPI
- yfinance
- Pydantic
- pytest

## Cara Menjalankan

### Prasyarat
- Node.js 20+
- Python 3.10+
- Git

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend berjalan di `http://localhost:8000`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173`.

### Environment
Frontend dapat diarahkan ke backend lain dengan membuat `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Contoh tersedia di `frontend/.env.example`.

## Validasi

### Backend
```bash
cd backend
python -m pytest
```

### Frontend
```bash
cd frontend
npm run lint
npm run build
```

## API Penting

- `GET /` - root status
- `GET /api/health` - status backend dan cache
- `GET /api/stocks?page=1&limit=10` - daftar saham
- `GET /api/stock/BBCA?period=3mo` - detail dan histori saham
- `GET /api/whale-alerts` - sinyal volume tidak biasa

## Deployment

Lihat panduan lengkap di `docs/DEPLOYMENT.md`.

## Preview

<img width="1362" height="983" alt="IDX Monitor Preview" src="https://github.com/user-attachments/assets/52738bb0-12af-4746-b29b-a3636a7bf298" />

## Kontribusi

Kontribusi selalu diterima melalui Issue atau Pull Request.

---
Dibuat oleh [Arsyacoo](https://github.com/Arsyacoo)
