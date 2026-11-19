import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ROOT, EVENTS_DIR } from "./config.mjs";
import { ymKey } from "./time.mjs";

function walk(dir, top = true) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (!(top && ent.name === "speakers")) out.push(...walk(p, false)); }
    else out.push(p);
  }
  return out;
}

export function loadSchema() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "schema/event.schema.json"), "utf8"));
}

/** Loads and validates every *.event.json. Returns { events, errors }. */
export function loadEvents(dir = EVENTS_DIR) {
  const schema = loadSchema();
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const errors = [];
  const events = [];
  const seen = new Map();

  for (const file of walk(dir).sort()) {
    const rel = path.relative(dir, file).split(path.sep).join("/");
    const base = path.basename(file);
    if (base === ".gitkeep") continue;
    if (!base.endsWith(".event.json")) {
      errors.push(`${rel}: unexpected file. Events must be named <uuid>.event.json`);
      continue;
    }
    let data;
    try { data = JSON.parse(fs.readFileSync(file, "utf8")); }
    catch (e) { errors.push(`${rel}: invalid JSON (${e.message})`); continue; }

    if (!validate(data)) {
      for (const er of validate.errors) errors.push(`${rel}: ${er.instancePath || "/"} ${er.message}${er.params?.allowedValues ? " (" + er.params.allowedValues.join(", ") + ")" : ""}`);
      continue;
    }
    const problems = [];
    if (base !== `${data.id}.event.json`) problems.push(`file name must be ${data.id}.event.json`);
    const expectDir = `${ymKey(data.start)}/`;
    if (!rel.startsWith(expectDir) || rel.split("/").length !== 3)
      problems.push(`file must live in ${expectDir} (year/month of "start" in UTC)`);
    if (data.end < data.start) problems.push(`"end" is before "start"`);
    if (data.previousStart && data.previousEnd && data.previousEnd < data.previousStart) problems.push(`"previousEnd" is before "previousStart"`);
    if (data.status === "rescheduled" && data.previousStart === data.start) problems.push(`rescheduled but previousStart equals start`);
    if (data.status === "scheduled" && (data.previousStart || data.statusNote)) problems.push(`previousStart/statusNote are only allowed when status is not scheduled`);
    if (data.price?.maxAmount < data.price?.minAmount) problems.push(`price.maxAmount is below minAmount`);
    if (data.price?.free && (data.price.minAmount || data.price.maxAmount)) problems.push(`price.free is true but amounts are set`);
    if (data.registration?.closesAt && data.registration?.opensAt && data.registration.closesAt < data.registration.opensAt) problems.push(`registration closes before it opens`);
    try { new Intl.DateTimeFormat("en", { timeZone: data.timezone }); } catch { problems.push(`unknown IANA time zone "${data.timezone}"`); }
    if (seen.has(data.id)) problems.push(`duplicate id, also used in ${seen.get(data.id)}`);
    seen.set(data.id, rel);
    if (problems.length) { for (const p of problems) errors.push(`${rel}: ${p}`); continue; }
    events.push({ ...data, _file: rel });
  }
  events.sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));
  return { events, errors };
}
