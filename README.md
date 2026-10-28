# Teman Ngopi

## Menjalankan

Python 3 sudah cukup; tidak perlu memasang paket tambahan.

```powershell
py server.py
```

Buka [http://localhost:8000](http://localhost:8000). Sapaan dan jumlah sapa tersimpan di `teman_ngopi.sqlite3`, sehingga tetap ada setelah server dimulai ulang.

Untuk mengajak teman yang terhubung ke Wi-Fi yang sama, bagikan alamat komputer ini. Cari alamat IPv4 dengan `ipconfig`, lalu teman membuka `http://ALAMAT-IP:8000`. Jika tidak dapat diakses, izinkan Python menerima koneksi jaringan lokal lewat Windows Firewall.

Server memperbarui papan setiap lima detik. Akun browser mengikat nama ke sapaan dan balasan, tetapi bukan pengganti verifikasi nomor telepon atau perlindungan spam.

## Akun pengguna

Saat pertama membuka website di sebuah browser, pengguna membuat nama akun sekali. ID acak disimpan di penyimpanan lokal browser dan nama akun di database server; sapaan dan balasan berikutnya memakai nama tersebut. Setiap profil browser memiliki akun terpisah. Menghapus data situs atau memakai browser lain akan membuat ID baru. Sistem ini tidak membuktikan satu akun per nomor telepon atau per orang.

## Pasang di Android

Untuk pemasangan dari Chrome dan agar teman bisa ikut menyapa dari perangkat lain, deploy aplikasi di alamat HTTPS publik. Buka alamat itu di Chrome Android, lalu pilih **Pasang aplikasi** jika tombolnya tersedia, atau buka menu Chrome dan pilih **Tambahkan ke layar utama**. Alamat `localhost` hanya berlaku di komputer yang menjalankan server; hosting publik juga harus memakai penyimpanan persisten agar database sapaan tidak hilang saat server dimulai ulang.

Service worker menyimpan tampilan aplikasi untuk dibuka kembali saat offline. Saat perangkat online, aplikasi memeriksa pembaruan ketika dibuka atau kembali ke tab, lalu memasang versi baru dan memuat ulang halaman secara otomatis. Perubahan tidak dapat diterima ketika aplikasi tertutup atau perangkat offline; pembaruan diterapkan saat pengguna kembali membuka aplikasi dengan koneksi internet. Mengirim dan melihat sapaan tetap memerlukan koneksi ke backend.

Ikon PWA dapat dibuat ulang tanpa paket tambahan:

```powershell
py make_icons.py
```

## Admin dan akses publik

Panel moderasi tersedia di `/admin`. Sebelum menjalankan server, atur kata sandi admin di PowerShell. Kata sandi minimal 16 karakter; nilainya hanya berlaku pada terminal tersebut:

```powershell
$secure = Read-Host "Kata sandi admin (minimal 16 karakter)" -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $secure).Password
py server.py
```

Login admin berlaku selama server berjalan dan sesi berakhir setelah delapan jam. Daftar admin menampilkan hingga 200 sapaan terbaru dan dapat menghapus sapaan. Jika `ADMIN_PASSWORD` belum diatur, halaman publik tetap berjalan tetapi login admin dinonaktifkan.

Untuk mencoba akses internet dari komputer sendiri, pasang `cloudflared` dari dokumentasi Cloudflare. Biarkan server tetap berjalan, lalu buka terminal PowerShell kedua dan jalankan:

```powershell
cloudflared tunnel --url http://localhost:8000
```

Buka URL HTTPS `trycloudflare.com` yang ditampilkan dari HP atau bagikan ke publik. URL uji ini berubah saat tunnel dimulai ulang dan hanya aktif selama komputer, server, serta tunnel menyala. Jangan bagikan URL admin tanpa kata sandi yang kuat. Untuk alamat tetap dan layanan yang selalu aktif, gunakan domain serta tunnel bernama atau deploy ke VPS; komputer rumah bukan pengganti hosting dengan uptime terjamin. Backup file database `teman_ngopi.sqlite3` secara berkala.