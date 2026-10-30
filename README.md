# Ping Pong 3D Game & Android App 🏓

Game 3D Tenis Meja Interaktif berbasis Three.js yang siap dijalankan sebagai **Website PWA** dan **Aplikasi Android (.APK)** yang dapat diunduh langsung lewat **GitHub Releases / Actions**.

---

## 🛠️ Perbaikan & Pembaruan Yang Telah Dilakukan
1. **Perbaikan Bug JavaScript (Crash Skor)**:
   - Memperbaiki `ReferenceError: bestScore is not defined` pada file `index.html` yang sebelumnya membuat game error saat pemain mencetak poin pertama.
2. **Struktur Aplikasi Android Native (WebView + Kotlin)**:
   - Menambahkan struktur project Android Gradle lengkap (`/app`, `MainActivity.kt`, `AndroidManifest.xml`, `build.gradle.kts`).
   - Tampilan Fullscreen Edge-to-Edge dengan performa WebGL terakselerasi hardware.
3. **Workflow Otomatisasi GitHub Actions (`.github/workflows/build-and-release.yml`)**:
   - Secara otomatis membangun file **Android APK (`app-debug.apk`)** setiap kali ada commit / push ke GitHub.
   - Secara otomatis mempublikasikan APK ke **GitHub Releases**.
   - Secara otomatis mendepoy game ke **GitHub Pages**.

---

## 🚀 Cara Mengunggah ke GitHub

Jalankan perintah berikut di terminal komputer Anda pada folder ini:

```bash
git init
git add .
git commit -m "Fix game bug and add Android App + GitHub workflow"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```
*(Ganti `USERNAME/NAMA-REPO` dengan URL repository GitHub Anda).*

---

## 📲 Cara Mengunduh Aplikasi (APK) Lewat GitHub

Setelah kode di-push ke GitHub, pengguna di internet dapat mengunduh APK dengan 2 cara:

### Cara 1: Lewat GitHub Actions (Otomatis Setiap Push)
1. Buka repository GitHub Anda di browser.
2. Klik tab **Actions** di bagian atas.
3. Klik workflow **Build APK and Deploy** yang paling atas.
4. Scroll ke bagian bawah halaman (sekitar section **Artifacts**).
5. Klik **`PingPong-Game-APK`** untuk mendownload file zip berisi `app-debug.apk`.
6. Ekstrak zip dan install `app-debug.apk` di HP Android Anda.

### Cara 2: Lewat GitHub Releases (Versi Resmi)
1. Di halaman repository GitHub Anda, buat **Tag / Release baru** (contoh: `v1.0.0`).
2. GitHub Actions secara otomatis akan membuat Release dan melampirkan file `app-debug.apk`.
3. Pengunjung dapat mengklik tombol **Releases** di samping kanan repository dan mendownload APK dengan mudah.

---

## 🌐 Cara Menjalankan Versi Web / PWA di GitHub Pages

1. Buka repository Anda di GitHub -> **Settings** -> **Pages**.
2. Pada bagian **Build and deployment / Source**, pilih **GitHub Actions**.
3. Workflow akan otomatis mendepoy website Anda ke URL:
   `https://USERNAME.github.io/NAMA-REPO/`
4. Pengunjung dapat langsung bermain lewat browser HP / PC atau menekan tombol **"Pasang aplikasi"** di dalam game untuk menginstall PWA langsung ke layar utama HP.

---

## 💻 Cara Mengembangkan / Menjalankan di Android Studio
1. Buka **Android Studio**.
2. Pilih **Open** dan pilih folder project ini (`membuat game`).
3. Tunggu proses **Gradle Sync** selesai.
4. Hubungkan HP Android atau jalankan **Emulator**.
5. Klik tombol **Run (▶)** atau tekan `Shift + F10`.
