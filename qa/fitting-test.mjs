import { chromium } from "playwright";

const BASE = "http://localhost:3199";
const DIR = new URL(".", import.meta.url).pathname;
const errors = [];
const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate((build) => {
  const app = window.__app.getState();
  app.setMeasurements({
    chestIn: 40, waistIn: 34, hipIn: 38, shoulderIn: 18,
    shirtSize: "L", pantsWaist: 34, build: "average", buildFactor: build,
  });
  app.setStage("world");
}, Number(process.env.BUILD || 1.0));
await page.waitForSelector("canvas", { state: "attached", timeout: 60000 });
await page.waitForTimeout(9000);
await page.evaluate((top) => {
  window.__app.getState().wear({ id: top, slot: "top", name: "x", brand: "x", price: 49, color: "#1e8449", shop: "street" });
  window.__app.getState().wear({ id: "jeans-blue", slot: "bottom", name: "x", brand: "x", price: 39, color: "#34495e", shop: "street" });
}, process.env.TOP || "hoodie-green");
await page.waitForTimeout(3500);

// size compare on the top: tight / recommended / loose
for (const [d, name] of [[-1, "tight"], [0, "rec"], [1, "loose"]]) {
  await page.evaluate((dd) => {
    window.__app.getState().setSizeDelta("top", dd);
  }, d);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${DIR}fit-${name}.png`, clip: { x: 400, y: 100, width: 480, height: 700 } });
}

// spin: capture mid-turn (side profile-ish)
await page.evaluate(() => {
  window.__app.getState().setSizeDelta("top", 0);
  window.__app.getState().setSpinning(true);
});
await page.waitForTimeout(1600); // ~quarter turn
await page.screenshot({ path: DIR + "fit-spin.png", clip: { x: 400, y: 100, width: 480, height: 700 } });

console.log("ERRORS:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
