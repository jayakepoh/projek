# 📲 Cara Pasang "Bintang Jatuh" di HP Android

Folder `aplikasi-android` ini adalah paket PWA (Progressive Web App) lengkap:
`index.html` + `manifest.json` + `sw.js` (offline) + `icon.png`.

## Langkah 1 — Hosting (WAJIB, gratis)

PWA butuh di-hosting lewat **HTTPS** agar Chrome bisa meng-install-nya sebagai aplikasi.
Cara termudah (2 menit, gratis):

**Netlify Drop:**
1. Buka https://app.netlify.com/drop
2. Drag & drop seluruh folder `aplikasi-android` ke halaman itu
3. Tunggu beberapa detik → kamu dapat alamat seperti `https://nama-acak.netlify.app`

Alternatif: GitHub Pages, Vercel, Cloudflare Pages — semuanya gratis.

## Langkah 2 — Install di HP Android

1. Buka alamat hosting tadi pakai **Chrome** di HP
2. Mainkan dulu sebentar, lalu muncul tombol **"📲 Pasang sebagai Aplikasi"** di menu — ketuk itu
   (atau: menu Chrome ⋮ → *Tambahkan ke layar utama / Install app*)
3. Selesai! Muncul ikon ⭐ "Bintang Jatuh" di layar utama HP:
   - Terbuka **layar penuh** seperti aplikasi asli (tanpa address bar)
   - Bisa dimainkan **tanpa internet** (offline)
   - Skor terbaik tersimpan di HP

## Langkah 3 (Opsional) — Jadikan file APK sungguhan

Kalau ingin file `.apk` untuk dibagikan langsung:
- **PWABuilder** (https://www.pwabuilder.com) — tempel URL hosting-nya, pilih *Android*, unduh APK/AAB yang sudah ditandatangani. Gratis, buatan Microsoft.
- Atau jalankan `npx @bubblewrap/cli init --manifest=<URL manifest>` (butuh JDK & Android SDK).

> Catatan: meng-hosting file ini bukan berarti otomatis ada di Play Store — untuk Play Store gunakan PWABuilder pilihan *Android App Bundle* dan daftarkan akun developer.
