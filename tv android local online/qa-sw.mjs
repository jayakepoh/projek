export default async function run(page) {
  // Cek apakah service worker meng-cache app.js lama.
  const reg = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    const keys = await caches.keys();
    return { swCount: regs.length, cacheKeys: keys };
  });
  return reg;
}
