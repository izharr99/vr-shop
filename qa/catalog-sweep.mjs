import { chromium } from "playwright";

const BASE = "http://localhost:3199";
const DIR = new URL(".", import.meta.url).pathname;
const errors = [];
const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text().slice(0, 200)));

const CATALOG = [
  { id: "tee-red", slot: "top", color: "#c0392b" },
  { id: "tee-blue", slot: "top", color: "#2471a3" },
  { id: "hoodie-green", slot: "top", color: "#1e8449", accent: "#145a32" },
  { id: "hoodie-black", slot: "top", color: "#212121", accent: "#111111" },
  { id: "jeans-blue", slot: "bottom", color: "#34495e" },
  { id: "joggers-grey", slot: "bottom", color: "#7f8c8d" },
  { id: "cap-red", slot: "hat", color: "#e74c3c" },
  { id: "shirt-white", slot: "top", color: "#ecf0f1", accent: "#bdc3c7" },
  { id: "blazer-navy", slot: "top", color: "#1a2942", accent: "#0f1a2e" },
  { id: "shirt-pink", slot: "top", color: "#d98880" },
  { id: "slacks-grey", slot: "bottom", color: "#4d5656" },
  { id: "chinos-tan", slot: "bottom", color: "#b9905f" },
  { id: "fedora", slot: "hat", color: "#5d4037" },
];
const item = (id) => {
  const c = CATALOG.find((i) => i.id === id);
  return { ...c, name: id, brand: "x", price: 10, shop: "street" };
};

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

const wear = async (it) => {
  await page.evaluate((i) => window.__app.getState().wear(i), it);
};
const clearSlot = async (id) => wear(item(id)); // wearing same id again removes

const suffix = process.env.BUILD ? `-b${process.env.BUILD}` : "";
const shot = (name) =>
  page.screenshot({ path: `${DIR}sweep-${name}${suffix}.png`, clip: { x: 430, y: 130, width: 420, height: 660 } });

// tops (with jeans on)
await wear(item("jeans-blue"));
for (const id of ["tee-red", "tee-blue", "hoodie-green", "hoodie-black", "shirt-white", "blazer-navy", "shirt-pink"]) {
  await wear(item(id));
  await page.waitForTimeout(1300);
  await shot(id);
  await clearSlot(id);
}
// bottoms (with tee on)
await wear(item("tee-blue"));
for (const id of ["jeans-blue", "joggers-grey", "slacks-grey", "chinos-tan"]) {
  await wear(item(id));
  await page.waitForTimeout(1300);
  await shot(id);
  await clearSlot(id);
}
// hats
await wear(item("jeans-blue"));
for (const id of ["cap-red", "fedora"]) {
  await wear(item(id));
  await page.waitForTimeout(1000);
  await shot(id);
  await clearSlot(id);
}

console.log("ERRORS:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
