export default async function run(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.evaluate(() => document.querySelector('#manage-sources').click());
  await page.waitForTimeout(300);
  await page.locator('#playlist-file').setInputFiles('channels-clean.m3u');
  await page.waitForFunction(() => document.querySelector('#channel-count').textContent !== '0 kanal', null, { timeout: 5000 });
  await page.evaluate(() => {
    const input = document.querySelector('#search-input');
    input.value = 'CNN Indonesia';
    input.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('#channel-list .channel-row')?.click());
  await page.waitForTimeout(10000);
  return 'clicked';
}
