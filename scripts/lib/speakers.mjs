import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ROOT, SPEAKERS_DIR, SITE_URL, speakerUrl } from "./config.mjs";

/** Loads and validates every speakers/<uuid>.speaker.json (flat folder). Returns { speakers, errors }. */
export function loadSpeakers(dir = SPEAKERS_DIR) {
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, "schema/speaker.schema.json"), "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const errors = [];
  const speakers = [];
  const seen = new Map();
  if (!fs.existsSync(dir)) return { speakers, errors };
  for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = ent.name;
    if (rel === ".gitkeep") continue;
    if (ent.isDirectory()) { errors.push(`speakers/${rel}: subfolders are not allowed, speakers/ is flat`); continue; }
    if (!rel.endsWith(".speaker.json")) { errors.push(`speakers/${rel}: unexpected file. Speakers must be named <uuid>.speaker.json`); continue; }
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, rel), "utf8")); }
    catch (e) { errors.push(`speakers/${rel}: invalid JSON (${e.message})`); continue; }
    if (!validate(data)) {
      for (const er of validate.errors) errors.push(`speakers/${rel}: ${er.instancePath || "/"} ${er.message}`);
      continue;
    }
    const problems = [];
    if (rel !== `${data.id}.speaker.json`) problems.push(`file name must be ${data.id}.speaker.json`);
    if (seen.has(data.id)) problems.push(`duplicate id, also used in ${seen.get(data.id)}`);
    seen.set(data.id, rel);
    if (problems.length) { for (const p of problems) errors.push(`speakers/${rel}: ${p}`); continue; }
    speakers.push({ ...data, _file: rel });
  }
  speakers.sort((a, b) => a.name.localeCompare(b.name));
  return { speakers, errors };
}

/**
 * Resolves {speakerId} references. Sets e._speakers = [{ name, affiliation?, speakerId?, url?, talk? }]
 * and s._events (events a speaker is listed in). Returns error strings for unknown ids.
 */
export function resolveSpeakers(events, speakers) {
  const byId = new Map(speakers.map((s) => [s.id, s]));
  const errors = [];
  for (const s of speakers) s._events = [];
  for (const e of events) {
    e._speakers = (e.speakers || []).flatMap((x) => {
      if (!x.speakerId) return [x];
      const s = byId.get(x.speakerId);
      if (!s) { errors.push(`${e._file}: speakerId ${x.speakerId} does not exist in speakers/`); return []; }
      s._events.push({ event: e, talk: x.talk });
      return [{ name: s.name, ...(s.affiliation && { affiliation: s.affiliation }), speakerId: s.id, ...(s.identity && { identity: s.identity }), ...(x.talk && { talk: x.talk }) }];
    });
  }
  for (const s of speakers) s._events.sort((a, b) => b.event.start.localeCompare(a.event.start));
  return errors;
}

export function speakerJsonLd(s, { context = true } = {}) {
  const j = {};
  if (context) j["@context"] = "https://schema.org";
  j["@type"] = "Person";
  j["@id"] = s.identity || speakerUrl(s);
  j.url = speakerUrl(s);
  j.identifier = s.id;
  j.name = s.name;
  if (s.bio) j.description = s.bio;
  if (s.role) j.jobTitle = s.role;
  if (s.affiliation) j.affiliation = { "@type": "Organization", name: s.affiliation };
  if (s.image) j.image = s.image.url;
  if (s.links?.length) j.sameAs = s.links.map((l) => l.url);
  if (s.topics?.length) j.knowsAbout = s.topics;
  j.subjectOf = s._events.map(({ event }) => ({ "@type": "Event", "@id": `${SITE_URL}/events/${event.id}/`, name: event.name }));
  if (!j.subjectOf.length) delete j.subjectOf;
  return j;
}

export function speakerMarkdown(s, { heading = 2 } = {}) {
  const h = "#".repeat(heading);
  const L = [`${h} ${s.name}`, ""];
  const sub = [s.role, s.affiliation].filter(Boolean).join(", ");
  if (sub) L.push(sub, "");
  if (s.bio) L.push(s.bio, "");
  for (const l of s.links || []) L.push(`- ${l.label}: ${l.url}`);
  if (s.topics?.length) L.push(`- Topics: ${s.topics.join(", ")}`);
  for (const { event, talk } of s._events) L.push(`- Spoke or speaks at: [${event.name}](${SITE_URL}/events/${event.id}/event.md)${talk ? `, "${talk}"` : ""}`);
  L.push(`- Profile: ${speakerUrl(s)}`, `- Source: ${s.source.url} (verified ${s.lastVerified})`, "");
  return L.join("\n");
}
