# OS TV Android

Aplikasi native Android untuk ponsel dan Android TV, dengan playlist M3U dan pemutaran HLS. Layout menyesuaikan ukuran layar, mendukung sentuhan dan remote D-pad, dan tidak membundel kanal atau URL stream. Gunakan playlist resmi/berizin; aplikasi hanya menerima URL playlist dan stream HTTPS.

## Build APK

1. Pasang Android Studio versi terbaru, Android SDK Platform 35, dan JDK 17.
2. Buka folder `android-tv` di Android Studio dan tunggu Gradle Sync mengunduh plugin serta Media3.
3. Pilih **Build > Build APK(s)**. APK debug akan berada di `app/build/outputs/apk/debug/`.
4. Pasang APK debug dari `app/build/outputs/apk/debug/` ke ponsel Android atau Android TV. Untuk ponsel, pindahkan APK ke perangkat lalu buka file tersebut dan izinkan pemasangan dari sumber ini bila diminta. APK debug cocok untuk uji coba/sideload, bukan publikasi Play Store.

## Penggunaan

Masukkan URL playlist M3U HTTPS menggunakan remote atau keyboard, pilih **Muat Daftar Kanal**, atau pilih **Pilih File M3U** untuk membuka playlist dari penyimpanan perangkat/USB. Setelah kanal dimuat, pilih kanal dengan D-pad dan tekan OK. URL playlist yang dimasukkan disimpan di perangkat.

Stream harus dapat diputar di Android dan tidak boleh memerlukan pembukaan DRM/akses yang tidak Anda miliki. Dukungan pemutaran bergantung pada format dan kebijakan server penyedia.

Proyek ini memerlukan Android SDK dan JDK 17 untuk membangun APK. Lingkungan pembuatan saat ini belum memiliki keduanya, sehingga APK belum bisa dibangun atau diuji di sini.