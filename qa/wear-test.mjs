import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3199";
const DIR = new URL(".", import.meta.url).pathname;
const errors = [];

const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console: " + m.text());
  if (m.text().includes("GARMENT")) console.log(m.text());
});

await page.goto(BASE, { waitUntil: "networkidle" });

// drive the store directly: set measurements + enter world
await page.evaluate((build) => {
  const app = window.__app.getState();
  app.setMeasurements({
    chestIn: 40, waistIn: 34, hipIn: 38, shoulderIn: 18,
    shirtSize: "L", pantsWaist: 34, build: "average", buildFactor: build,
  });
  app.setStage("world");
}, Number(process.env.BUILD || 1.0));

await page.waitForSelector("canvas", { state: "attached", timeout: 60000 });
await page.waitForTimeout(10000);

// wear a full outfit
await page.evaluate((ids) => {
  const app = window.__app.getState();
  for (const id of ids) {
    const item = { "blazer-navy": 1 } && null;
  }
}, []);
await page.evaluate((outfit) => {
  const app = window.__app.getState();
  // wear() takes catalog items; replicate byId via a tiny inline catalog ping:
  // instead, dispatch through the store's wear with items pulled from window catalog
  return outfit;
}, []);
// simplest: click nothing — wear via store using catalog imported on window? Not exposed.
// Use keyboard-free direct call: wear items by reconstructing minimal item objects.
await page.evaluate((outfit) => {
  const app = window.__app.getState();
  for (const it of outfit) app.wear(it);
}, [
  { id: process.env.TOP || "hoodie-green", slot: "top", name: "x", brand: "x", price: 1, color: process.env.TOPC || "#1e8449", shop: "street" },
  { id: process.env.BOTTOM || "jeans-blue", slot: "bottom", name: "x", brand: "x", price: 1, color: process.env.BOTC || "#34495e", shop: "street" },
  { id: "cap-red", slot: "hat", name: "x", brand: "x", price: 1, color: "#e74c3c", shop: "street" },
]);
await page.waitForTimeout(3000);
console.log(
  "scene probe:",
  await page.evaluate(() => {
    const scene = window.__scene;
    const out = [];
    scene.traverse((o) => {
      if (o.isSkinnedMesh || (o.isMesh && /sphere/i.test(o.geometry?.type || ""))) {
        o.updateWorldMatrix(true, false);
        const p = new (o.position.constructor)();
        o.getWorldPosition(p);
        out.push({
          name: o.name || o.geometry?.type,
          type: o.type,
          skinned: !!o.isSkinnedMesh,
          mat: o.material?.color?.getHexString?.(),
          worldPos: p.toArray().map((v) => +v.toFixed(2)),
          worldScale: (() => { const s = new (o.scale.constructor)(); o.getWorldScale(s); return s.toArray().map((v) => +v.toFixed(3)); })(),
        });
      }
    });
    return out;
  })
);
console.log(
  "diff body vs clone:",
  await page.evaluate(() => {
    const scene = window.__scene;
    let body = null, clone = null;
    scene.traverse((o) => {
      if (o.isSkinnedMesh && o.name === "Beta_Surface") body = o;
      if (o.isSkinnedMesh && !o.name) clone = o;
    });
    if (!body || !clone) return "missing";
    const dump = (m) => ({
      bindMode: m.bindMode,
      matrixWorld: m.matrixWorld.elements.map((v) => +v.toFixed(4)),
      bindMatrix: m.bindMatrix.elements.map((v) => +v.toFixed(4)),
      bindMatrixInverse: m.bindMatrixInverse.elements.map((v) => +v.toFixed(4)),
      skeletonSame: m.skeleton === body.skeleton,
      attrs: Object.keys(m.geometry.attributes),
      matrixAutoUpdate: m.matrixAutoUpdate,
      parent: m.parent?.name,
    });
    const b = dump(body), c = dump(clone);
    const diffs = {};
    for (const k of Object.keys(b)) {
      if (JSON.stringify(b[k]) !== JSON.stringify(c[k])) diffs[k] = { body: b[k], clone: c[k] };
    }
    return { diffs, sample: { bodyBindInv0: b.bindMatrixInverse[0], cloneBindInv0: c.bindMatrixInverse[0], bodyWorld0: b.matrixWorld[0], cloneWorld0: c.matrixWorld[0] } };
  })
);
console.log(
  "center ray:",
  await page.evaluate(() => {
    const { __scene: scene, __camera: camera, __THREE: THREE } = window;
    if (!THREE) return "THREE not exposed";
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = ray.intersectObjects(scene.children, true).slice(0, 3);
    return hits.map((h) => ({
      name: h.object.name || h.object.geometry?.type,
      type: h.object.type,
      color: h.object.material?.color?.getHexString?.(),
      dist: +h.distance.toFixed(2),
    }));
  })
);
await page.screenshot({ path: DIR + (process.env.OUT || "wear-back.png") });

// walk a bit so the walk animation engages, then screenshot mid-stride
await page.keyboard.down("s");
await page.waitForTimeout(900);
await page.keyboard.up("s");
await page.waitForTimeout(200);
await page.screenshot({ path: DIR + (process.env.OUT || "wear-back.png").replace(".png", "-walk.png") });

console.log("ERRORS:", errors.length ? errors.slice(0, 6) : "none");
await browser.close();
