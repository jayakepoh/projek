export default async function run(page) {
  // Kode versi apa yang benar-benar berjalan? Tandai di window.
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    regs.forEach(r => r.unregister());
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  });
  await page.reload();
  return await page.evaluate(() => {
    // uji: apakah startXhrHls ada di lingkup modul?  Cek lewat sumber yang dimuat.
    const scripts = [...document.querySelectorAll('script')].map(s => s.src);
    return { scripts, hlsVer: window.Hls?.version };
  });
}
