const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3002';
const OUT_DIR = '/tmp/screenshots';

const PAGES = [
  { name: 'chatbot', path: '/chatbot' },
  { name: 'ai-recognition', path: '/ai-recognition' },
  { name: 'recipe', path: '/recipe' },
  { name: 'rescue-list', path: '/rescue-list' },
  { name: 'cooking-process', path: '/cooking-process' },
  { name: 'cooking-history', path: '/cooking-history' },
  { name: 'settings', path: '/settings' },
  { name: 'tutorial', path: '/tutorial' },
];

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const loginPage = await context.newPage();

  console.log('브라우저 열림 - Google로 로그인 후 아무 내부 페이지가 열릴 때까지 기다립니다...');
  await loginPage.goto(BASE_URL + '/login');

  // Wait for next-auth.session-token cookie to appear (real login complete)
  await loginPage.waitForFunction(() => {
    return document.cookie.includes('next-auth.session-token') ||
           !window.location.pathname.includes('/login');
  }, { timeout: 120000 });

  // Extra wait for session to fully settle
  await loginPage.waitForTimeout(2000);

  // Check session cookie via context
  const cookies = await context.cookies();
  const sessionCookie = cookies.find(c => c.name === 'next-auth.session-token');
  console.log('세션 쿠키:', sessionCookie ? '확인됨 ✓' : '없음 - 재시도 필요');

  await loginPage.close();

  // Screenshot all pages in the same authenticated context
  for (const p of PAGES) {
    const pg = await context.newPage();
    console.log(`캡쳐 중: ${p.name}`);
    await pg.goto(BASE_URL + p.path, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await pg.waitForTimeout(2000);

    const url = pg.url();
    console.log(`  현재 URL: ${url}`);

    await pg.screenshot({ path: path.join(OUT_DIR, `${p.name}.png`), fullPage: true });
    console.log(`  -> 저장: /tmp/screenshots/${p.name}.png`);
    await pg.close();
  }

  await browser.close();
  console.log('\n모든 캡쳐 완료!');
})();
