// Zero-dependency static server: node scripts/serve.mjs <dir> [port]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] || "dist");
const port = Number(process.argv[3]) || 8080;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".jsonld": "application/ld+json", ".ics": "text/calendar; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

createServer(async (req, res) => {
  let file;
  try {
    const p = normalize("/" + decodeURIComponent(req.url.split("?")[0].split("#")[0]));
    file = join(root, p);
    if (!file.startsWith(root)) return res.writeHead(403).end();
  } catch { return res.writeHead(400).end(); }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" }).end(await readFile(file));
  } catch { res.writeHead(404).end("not found"); }
}).listen(port, "127.0.0.1", () => console.log(`http://localhost:${port}`));
