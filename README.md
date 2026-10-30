# OS TV Android

PWA pemutar playlist TV. Aplikasi ini tidak menyertakan siaran atau membypass DRM; tambahkan playlist dari penyedia resmi atau sumber yang memang Anda berhak akses.

## Jalankan di komputer

```powershell
node server.js
```

Buka `http://localhost:4173`. Atur port dengan environment variable `PORT` bila diperlukan.

Server lokal ini juga menyediakan proxy di `/proxy?url=<URL stream>` (khusus pengembangan di localhost). Pemutar memakainya secara otomatis ketika sebuah stream HLS diblokir kebijakan CORS oleh server penyedia. Jangan ekspos proxy ini ke jaringan publik karena bisa dipakai pihak lain sebagai pembuka akses.

## Pasang di Android dan komputer

Untuk pemasangan dari browser, host folder ini di layanan hosting statis dengan HTTPS. Buka URL HTTPS di Chrome/Edge, lalu pilih **Pasang aplikasi** atau **Tambahkan ke layar utama**. Localhost hanya untuk uji coba di komputer yang sama.

## Tambahkan kanal

Pilih **Kelola playlist**, lalu impor file `.m3u`/`.m3u8`, tempel isi M3U, atau masukkan URL yang mengizinkan akses lintas origin (CORS). Playlist baru yang diimpor **menimpa** daftar kanal lama. Daftar tersimpan di browser perangkat tersebut dan tidak disinkronkan ke perangkat lain.

## Periksa kanal mati

```powershell
node check-playlist.js channels-id.m3u --write
```

Memeriksa tiap URL kanal (tanpa mendekode video) dan, dengan `--write`, menulis `channels-clean.m3u` hanya berisi kanal yang masih merespons.
Pemutaran tergantung format stream, dukungan browser, CORS, jaringan, serta hak akses dari penyedia. HLS dibantu oleh hls.js dari jsDelivr; stream ber-DRM atau yang melarang pemutaran browser tidak akan berfungsi.


## Unduh APK langsung dari GitHub

Repo ini menyertakan GitHub Actions (`.github/workflows/build-apk.yml`) yang otomatis membuat APK debug setiap kali kode di-push ke `main`/`master`.

Cara unduh di HP Android:

1. Push repo ini ke GitHub (misal `github.com/username/os-tv-android`).
2. Buka tab **Actions** di halaman repo, pilih workflow **Build APK**, lalu buka run terbaru.
3. Di bagian **Artifacts**, unduh `os-tv-android-debug-apk` (file ZIP berisi APK). Buka ZIP di HP, ekstrak APK-nya, lalu ketuk untuk memasang (izinkan "install dari sumber tidak dikenal").
4. Opsional: buat tag seperti `v1.0.0` dan push (`git tag v1.0.0; git push origin v1.0.0`). Workflow akan otomatis melampirkan APK ke tab **Releases**, yang bisa diunduh langsung tanpa login.
