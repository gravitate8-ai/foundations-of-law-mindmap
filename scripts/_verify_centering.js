const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForSelector('button[aria-label^="Topic 3:"]');
  await page.waitForTimeout(1000); // let the entrance animations settle

  const getTransform = () =>
    page.evaluate(() => {
      const el = [...document.querySelectorAll("div")].find(
        (d) => d.style.transform.includes("scale(") && d.style.transformOrigin === "center center"
      );
      return el ? el.style.transform : null;
    });

  const viewportBox = () => page.locator(".mindmap-viewport").boundingBox();

  const before = await getTransform();
  const vp = await viewportBox();
  const centerBefore = await page.locator('button[aria-label^="Topic 3:"]').boundingBox();

  await page.click('button[aria-label^="Topic 3:"]');
  await page.waitForTimeout(900); // 0.3s transition + slack

  const after = await getTransform();
  const boxAfter = await page.locator('button[aria-label^="Topic 3:"]').boundingBox();

  const vpCx = vp.x + vp.width / 2;
  const vpCy = vp.y + vp.height / 2;
  const tileCx = boxAfter.x + boxAfter.width / 2;
  const tileCy = boxAfter.y + boxAfter.height / 2;
  const distAfter = Math.hypot(tileCx - vpCx, tileCy - vpCy);
  const distBefore = Math.hypot(
    centerBefore.x + centerBefore.width / 2 - vpCx,
    centerBefore.y + centerBefore.height / 2 - vpCy
  );

  // Question pills appeared?
  const pills = await page.locator('button[aria-label^="Open question"]').count();

  console.log(JSON.stringify({
    transformBefore: before,
    transformAfter: after,
    distBefore: Math.round(distBefore),
    distAfter: Math.round(distAfter),
    pills,
  }, null, 2));

  // Topic 15 (no questions) should open the notes drawer
  await page.click('button[aria-label^="Topic 15:"]');
  await page.waitForTimeout(900);
  const drawerVisible = await page.locator('text=Notes & Key Concepts').first().isVisible().catch(() => false);
  const drawerTitle = await page.locator('[data-slot="sheet-title"]').first().textContent().catch(() => null);
  console.log(JSON.stringify({ topic15DrawerVisible: drawerVisible, drawerTitle }));

  await browser.close();
})().catch((e) => {
  console.error("TEST FAILED:", e.message);
  process.exit(1);
});
