# Teman Ngopi

## Menjalankan

Python 3 sudah cukup; tidak perlu memasang paket tambahan.

```powershell
py server.py
```

Buka [http://localhost:8000](http://localhost:8000). Sapaan dan jumlah sapa tersimpan di `teman_ngopi.sqlite3`, sehingga tetap ada setelah server dimulai ulang.

Untuk mengajak teman yang terhubung ke Wi-Fi yang sama, bagikan alamat komputer ini. Cari alamat IPv4 dengan `ipconfig`, lalu teman membuka `http://ALAMAT-IP:8000`. Jika tidak dapat diakses, izinkan Python menerima koneksi jaringan lokal lewat Windows Firewall.

Server memperbarui papan setiap lima detik. Jangan membuka server ini langsung ke internet tanpa menambahkan akun, moderasi, dan perlindungan spam.

## Pasang di Android

Untuk pemasangan dari Chrome dan agar teman bisa ikut menyapa dari perangkat lain, deploy aplikasi di alamat HTTPS publik. Buka alamat itu di Chrome Android, lalu pilih **Pasang aplikasi** jika tombolnya tersedia, atau buka menu Chrome dan pilih **Tambahkan ke layar utama**. Alamat `localhost` hanya berlaku di komputer yang menjalankan server; hosting publik juga harus memakai penyimpanan persisten agar database sapaan tidak hilang saat server dimulai ulang.

Service worker menyimpan tampilan aplikasi untuk dibuka kembali saat offline. Mengirim dan melihat sapaan tetap memerlukan koneksi ke backend.

Ikon PWA dapat dibuat ulang tanpa paket tambahan:

```powershell
py make_icons.py
```