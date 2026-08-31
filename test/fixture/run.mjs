import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "/tmp/xh-puppeteer/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8765;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function serve(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/" || rel === "/home") rel = "/test/fixture/x-shell.html";
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": mime[path.extname(file)] || "text/plain" });
  res.end(fs.readFileSync(file));
}

const server = http.createServer(serve);
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/home?autotest=1`, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await page.waitForFunction(
    () => document.documentElement.hasAttribute("data-xh-fixture-result"),
    { timeout: 8000 },
  );
  const result = await page.evaluate(() =>
    JSON.parse(document.documentElement.getAttribute("data-xh-fixture-result")),
  );
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  server.close();
}
