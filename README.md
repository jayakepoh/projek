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
