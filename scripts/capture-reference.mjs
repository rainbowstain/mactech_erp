import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outDir = "/tmp/mactech-reference-captures";
const credentials = {
  email: "admin@example.com",
  password: "admin123",
};

async function ensureDir() {
  await fs.mkdir(outDir, { recursive: true });
}

async function screenshot(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`${name}: ${page.url()} -> ${file}`);
}

async function login(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await screenshot(page, `${baseUrl.includes("5175") ? "legacy" : "next"}-login`);

  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]').first();
  const password = page.locator('input[type="password"], input[name="password"]').first();

  await email.fill(credentials.email);
  await password.fill(credentials.password);

  const submit = page
    .locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login"), button:has-text("Iniciar")')
    .first();
  await submit.click();
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1400);
}

async function captureLegacy(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await login(page, "http://localhost:5175/");
  await screenshot(page, "legacy-after-login");

  const targets = [
    ["legacy-ordenes", /orden|listar/i],
    ["legacy-clientes", /cliente/i],
    ["legacy-servicios", /servicio/i],
    ["legacy-equipos", /equipo/i],
    ["legacy-dispositivos", /dispositivo|modelo/i],
  ];

  for (const [name, pattern] of targets) {
    const link = page.locator("a", { hasText: pattern }).first();
    if ((await link.count()) > 0) {
      await link.click();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(800);
      await screenshot(page, name);
    } else {
      console.warn(`No encontre link para ${name}`);
    }
  }

  await context.close();
}

async function captureNext(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await login(page, "http://localhost:3001/erp/login");
  await screenshot(page, "next-after-login");

  const urls = [
    ["next-ordenes", "http://localhost:3001/erp/ordenes"],
    ["next-clientes", "http://localhost:3001/erp/mantenedores/clientes"],
    ["next-servicios", "http://localhost:3001/erp/mantenedores/servicios"],
    ["next-equipos", "http://localhost:3001/erp/mantenedores/equipos"],
    ["next-dispositivos", "http://localhost:3001/erp/mantenedores/dispositivos"],
  ];

  for (const [name, url] of urls) {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await screenshot(page, name);
  }

  await context.close();
}

async function main() {
  await ensureDir();
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox"],
  });

  try {
    await captureLegacy(browser);
    await captureNext(browser);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
