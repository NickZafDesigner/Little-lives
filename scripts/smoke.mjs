import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.SMOKE_URL ?? "http://127.0.0.1:5173/";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });

const errors = [];
page.on("console", (msg) => {
  const text = msg.text();
  if (text.includes("GL Driver")) return;
  if (msg.type() === "error" || msg.type() === "warning") {
    errors.push(`[${msg.type()}] ${text}`);
  }
});
page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));

const response = await page.goto(URL, { waitUntil: "networkidle" });
console.log("status:", response?.status());
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/01-title.png` });

const canvas = await page.$("canvas");
if (!canvas) {
  console.log("NO CANVAS. body:", await page.evaluate(() => document.body.innerHTML));
  console.log(errors.join("\n") || "no console errors");
  await browser.close();
  process.exit(1);
}
const box = await canvas.boundingBox();
const click = async (rx, ry, waitMs = 700) => {
  await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry);
  await page.waitForTimeout(waitMs);
};

// Title -> character creation
await click(0.5, 0.46, 1800);
await page.screenshot({ path: `${OUT}/02-create.png` });

// "Start Life" -> world
await click(0.873, 0.912, 2800);
await page.screenshot({ path: `${OUT}/03-world.png` });

// Click a spot on the ground to walk there
await click(0.66, 0.66, 2600);
await page.screenshot({ path: `${OUT}/04-walked.png` });

// Hover an object to show the highlight + tooltip
await page.mouse.move(box.x + box.width * 0.36, box.y + box.height * 0.22);
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/05-hover.png` });

// Click that object: player should path to it, then a menu opens
await click(0.36, 0.22, 4200);
await page.screenshot({ path: `${OUT}/06-interact.png` });

// Hover the sofa, then click it to open its interaction menu
await page.mouse.move(box.x + box.width * 0.32, box.y + box.height * 0.33);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/06b-hover-sofa.png` });
await click(0.32, 0.33, 3600);
await page.screenshot({ path: `${OUT}/06c-menu.png` });

// Dismiss menu, enter build mode
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
await page.keyboard.press("b");
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/07-build.png` });

console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
