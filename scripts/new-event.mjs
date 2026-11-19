// Scaffolds a new event file: npm run new-event -- 2026-12-05T09:00:00Z
// Prints the generated UUID and path. The skeleton intentionally fails validation until completed.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ROOT } from "./lib/config.mjs";

const start = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(start || "")) {
  console.error("usage: npm run new-event -- <start as UTC, e.g. 2026-12-05T09:00:00Z>");
  process.exit(1);
}
const id = randomUUID();
const dir = path.join(ROOT, "events", start.slice(0, 4), start.slice(5, 7));
const file = path.join(dir, `${id}.event.json`);
const skeleton = {
  $schema: "https://events.outerfab.com/schema/event.schema.json",
  id, name: "TODO", summary: "TODO one or two sentences, at least 20 characters",
  type: "meetup", topics: [], status: "scheduled", revision: 0,
  start, end: start, timezone: "UTC", mode: "in-person",
  location: { name: "TODO", address: { locality: "TODO", country: "XX" } },
  url: "https://example.org/TODO",
  registration: { required: false },
  price: { free: true },
  organizers: [{ name: "TODO" }], responsibleOrganizer: { name: "TODO" }, languages: ["en"],
  source: { url: "https://example.org/TODO" },
  lastVerified: new Date().toISOString().slice(0, 10)
};
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, JSON.stringify(skeleton, null, 2) + "\n");
console.log(`${id}\n${path.relative(ROOT, file)}`);
