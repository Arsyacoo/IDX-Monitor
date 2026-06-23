# 🇮🇩 IDX Monitor

**IDX Monitor** adalah dashboard *real-time* yang elegan dan canggih untuk memantau pasar saham Indonesia (Bursa Efek Indonesia / IDX). Dibangun dengan teknologi web modern, aplikasi ini memberikan wawasan mendalam tentang pergerakan harga saham dan aktivitas pasar yang tidak biasa ("Whale Activities") dalam antarmuka yang responsif dan memukau.

## ✨ Fitur Utama

*   **📈 Monitoring Real-Time**: Pantau harga saham terkini, persentase perubahan, dan status pasar secara langsung.
*   **🐋 Whale Alerts**: Fitur unggulan untuk mendeteksi lonjakan volume transaksi yang tidak wajar, membantu Anda mengidentifikasi akumulasi besar-besaran oleh investor institusi ("Bandar").
*   **📊 Visualisasi Interaktif**: Grafik harga historis yang responsif untuk analisis teknikal cepat.
*   **🔍 Pencarian Pintar**: Cari emiten favorit Anda dengan mudah dan cepat.
*   **🎨 Desain Premium**: Antarmuka gelap (Dark Mode) yang modern, bersih, dan nyaman di mata, dirancang untuk pengalaman pengguna terbaik.

## 🛠️ Teknologi yang Digunakan

Project ini dibangun menggunakan *stack* teknologi terkini untuk performa dan skalabilitas maksimal:

### Frontend
*   **React + Vite**: Untuk performa UI yang super cepat.
*   **Tailwind CSS**: Untuk styling yang konsisten dan modern.
*   **TanStack Query**: Manajemen state server yang efisien (caching, auto-refetching).
*   **Recharts**: Visualisasi data yang cantik dan informatif.
*   **Lucide React**: Ikonografi yang tajam dan konsisten.

### Backend
*   **FastAPI**: Framework Python berkinerja tinggi untuk API.
*   **yfinance**: Pengambilan data pasar saham *real-time*.
*   **Python 3.10+**: Bahasa pemrograman utama untuk logika backend.

## 🚀 Cara Menjalankan

Ikuti langkah-langkah mudah ini untuk menjalankan IDX Monitor di komputer Anda:

### Prasyarat
Pastikan Anda sudah menginstall:
*   [Node.js](https://nodejs.org/) (untuk frontend)
*   [Python](https://python.org/) (untuk backend)
*   Git

### Instalasi & Menjalankan

1.  **Clone Repository**
    ```bash
    git clone https://github.com/Arsyacoo/IDX-Monitor.git
    cd IDX-Monitor
    ```

2.  **Jalankan Aplikasi (Cara Cepat)**
    Pengguna Windows cukup mengklik ganda file `run_app.bat` di folder root. Script ini akan otomatis menginstal dependensi dan menjalankan backend serta frontend secara bersamaan.

3.  **Jalankan Secara Manual**

    *   **Backend (Terminal 1)**
        ```bash
        cd backend
        pip install -r requirements.txt
        uvicorn main:app --reload
        ```
    
    *   **Frontend (Terminal 2)**
        ```bash
        cd frontend
        npm install
        npm run dev
        ```

4.  Buka browser dan akses `http://localhost:5173` (atau port yang tertera di terminal).

## 📸 Preview

*Dashboard saham dengan grafik interaktif dan daftar saham yang responsif.*

<img width="1362" height="983" alt="image" src="https://github.com/user-attachments/assets/52738bb0-12af-4746-b29b-a3636a7bf298" />

## 🤝 Kontribusi

Kontribusi selalu diterima! Jangan ragu untuk membuka *Issue* atau *Pull Request* jika Anda memiliki ide perbaikan atau fitur baru.

---
Dibuat dengan ❤️ oleh [Arsyacoo](https://github.com/Arsyacoo)

