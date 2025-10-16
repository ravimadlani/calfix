/**
 * Playwright script to compare old vs new home page
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  console.log('📸 Capturing Old App (CRA on port 3000)...');
  const oldPage = await context.newPage();
  try {
    await oldPage.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
    await oldPage.waitForTimeout(2000); // Wait for animations
    await oldPage.screenshot({
      path: path.join(screenshotsDir, 'old-app.png'),
      fullPage: true
    });
    console.log('✅ Old app screenshot saved: screenshots/old-app.png');
  } catch (error) {
    console.error('❌ Failed to capture old app:', error.message);
  }
  await oldPage.close();

  console.log('\n📸 Capturing New App (Vite on port 3001)...');
  const newPage = await context.newPage();
  try {
    await newPage.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 60000 });
    await newPage.waitForTimeout(2000); // Wait for animations
    await newPage.screenshot({
      path: path.join(screenshotsDir, 'new-app.png'),
      fullPage: true
    });
    console.log('✅ New app screenshot saved: screenshots/new-app.png');
  } catch (error) {
    console.error('❌ Failed to capture new app:', error.message);
  }
  await newPage.close();

  console.log('\n🔍 Opening both screenshots for comparison...');
  console.log('   Old: screenshots/old-app.png');
  console.log('   New: screenshots/new-app.png');

  await browser.close();
  console.log('\n✅ Comparison complete!');
})();
