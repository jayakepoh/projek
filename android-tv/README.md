# OS TV Android

Aplikasi Android dan Android TV yang menjalankan antarmuka web OS TV di WebView. Berkas UI dan playlist bawaan disalin otomatis dari folder utama saat build, sehingga perubahan pada `index.html`, `styles.css`, `app.js`, atau `channels-clean.m3u` ikut masuk ke APK berikutnya. Gunakan sumber siaran resmi atau yang Anda berhak akses.

## Build APK

1. Pasang Android Studio versi terbaru, Android SDK Platform 35, dan JDK 17.
2. Buka folder `android-tv` di Android Studio dan tunggu Gradle Sync mengunduh plugin serta AndroidX WebKit.
3. Pilih **Build > Build APK(s)**. APK debug akan berada di `app/build/outputs/apk/debug/`.
4. Pasang APK debug dari `app/build/outputs/apk/debug/` ke ponsel Android atau Android TV. Untuk ponsel, pindahkan APK ke perangkat lalu buka file tersebut dan izinkan pemasangan dari sumber ini bila diminta. APK debug cocok untuk uji coba/sideload, bukan publikasi Play Store.

## Penggunaan

UI web dan `channels-clean.m3u` dipaketkan dari folder utama saat build. Playlist dapat dikelola dari antarmuka aplikasi. Pemutaran stream eksternal bergantung pada dukungan WebView dan kebijakan CORS penyedia; server proxy lokal pada `server.js` tidak disertakan ke APK.

Folder utama tetap menjadi sumber berkas web. Skrip server dan QA digunakan untuk pengembangan dan tidak diperlukan di APK.

Proyek ini memerlukan Android SDK dan JDK 17 untuk membangun APK.