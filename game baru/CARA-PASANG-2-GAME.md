# 📲 Cara Pasang Kedua Game di HP Android

Kedua folder ini adalah paket PWA (Progressive Web App) siap install:

| Folder | Game |
|---|---|
| `aplikasi-android` | ⭐ Bintang Jatuh — tangkap bintang, hindari bom |
| `pingpong-app` | 🏓 Ping Pong — Main Tenis Meja 3D |

## Langkah 1 — Upload ke GitHub

Upload kedua folder ini ke repo `jayakepoh/projek` (misal lewat github.com → Add file → Upload files, drag & drop kedua folder sekaligus).

Setelah upload, struktur di repo harusnya:
```
projek/
├── aplikasi-android/   ← Bintang Jatuh
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js
│   └── icon.png
└── pingpong-app/       ← Ping Pong
    ├── index.html
    ├── manifest.json
    ├── sw.js
    └── icon.png
```

GitHub Pages sudah aktif, jadi tidak perlu setting apa-apa lagi.

## Langkah 2 — Buka di HP & Install

Tunggu ±1 menit setelah upload, lalu di HP buka Chrome:

**Bintang Jatuh:**
`https://jayakepoh.github.io/projek/aplikasi-android/`

**Ping Pong:**
`https://jayakepoh.github.io/projek/pingpong-app/`

Di masing-masing halaman:
1. Mainkan sebentar
2. Ketuk tombol **"📲 Pasang sebagai Aplikasi"** (atau menu Chrome ⋮ → *Tambahkan ke layar utama*)

Selesai! Dua ikon muncul di layar utama HP, terbuka layar penuh, dan bisa dimainkan **offline**.

## Opsional — Jadikan APK

Tempel URL masing-masing game ke https://www.pwabuilder.com → pilih *Android* → unduh APK. Gratis, buatan Microsoft.
