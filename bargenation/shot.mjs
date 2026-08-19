import { chromium } from 'playwright';
const base = process.env.BASE || 'http://localhost:3000';
const pages = (process.env.PAGES || '/').split(',');
const sizes = [[375,900,'375'],[768,1000,'768'],[1440,1100,'1440']];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const path of pages) {
  for (const [w,h,tag] of sizes) {
    const ctx = await browser.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2 });
    const p = await ctx.newPage();
    await p.goto(base+path, { waitUntil:'domcontentloaded' });
    await p.waitForTimeout(1800);
    const name = (path==='/'?'home':path.replace(/\//g,'-').replace(/^-/,''));
    await p.screenshot({ path:`/tmp/shots/${name}-${tag}.png`, fullPage:true });
    await ctx.close();
  }
}
await browser.close();
console.log('captured');
