// Builds the static site into dist/ from events/**/<uuid>.event.json.
// Usage: node scripts/build.mjs [--validate-only]
import fs from "node:fs";
import path from "node:path";
import { ROOT, SITE_URL, SITE_NAME, OUT_DIR, EVENTS_DIR, REPO_URL, INTRO, eventUrl, speakerUrl } from "./lib/config.mjs";
import { loadEvents } from "./lib/events.mjs";
import { loadSpeakers, resolveSpeakers, speakerJsonLd } from "./lib/speakers.mjs";
import { eventJsonLd, itemListJsonLd } from "./lib/jsonld.mjs";
import { ics } from "./lib/ics.mjs";
import { eventMarkdown, llmsTxt, llmsFullTxt } from "./lib/text.mjs";
import { indexPage, eventPage, speakersPage, setLogo, esc } from "./lib/html.mjs";
import { nowIso } from "./lib/time.mjs";

const { events, errors } = loadEvents();
const { speakers, errors: speakerErrors } = loadSpeakers();
errors.push(...speakerErrors);
if (!speakerErrors.length) errors.push(...resolveSpeakers(events, speakers));
if (errors.length) {
  console.error(`\n${errors.length} problem(s) in ${path.relative(ROOT, EVENTS_DIR)}/ or speakers/:\n`);
  for (const e of errors) console.error("  ✗ " + e);
  console.error("");
  process.exit(1);
}
console.log(`✓ ${events.length} event(s) and ${speakers.length} speaker(s) valid`);
if (process.argv.includes("--validate-only")) process.exit(0);

const now = nowIso();
fs.rmSync(OUT_DIR, { recursive: true, force: true });
const write = (rel, data) => {
  const f = path.join(OUT_DIR, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, data);
};
const json = (o) => JSON.stringify(o, null, 2) + "\n";

// static assets
fs.cpSync(path.join(ROOT, "site"), OUT_DIR, { recursive: true });
setLogo(fs.readFileSync(path.join(ROOT, "site/assets/logo.svg"), "utf8"));
fs.cpSync(path.join(ROOT, "schema/event.schema.json"), path.join(OUT_DIR, "schema/event.schema.json"));
fs.cpSync(path.join(ROOT, "schema/speaker.schema.json"), path.join(OUT_DIR, "schema/speaker.schema.json"));

// pages and per-event files
write("index.html", indexPage(events));
for (const e of events) {
  const { _file, _speakers, ...raw } = e;
  const d = `events/${e.id}/`;
  write(d + "index.html", eventPage(e));
  write(d + "event.json", json(raw));
  write(d + "event.jsonld", json(eventJsonLd(e)));
  write(d + "event.ics", ics([e], { name: e.name }));
  write(d + "event.md", eventMarkdown(e));
}

write("speakers/index.html", speakersPage(speakers));
for (const s of speakers) {
  const { _file, _events, ...raw } = s;
  write(`speakers/${s.id}.json`, json(raw));
  write(`speakers/${s.id}.jsonld`, json(speakerJsonLd(s)));
}
write("speakers.json", json(speakers.map(({ _file, _events, ...raw }) => ({ ...raw, url_canonical: speakerUrl(raw), events: _events.map(({ event, talk }) => ({ id: event.id, name: event.name, ...(talk && { talk }) })) }))));

// aggregates
write("events.json", json(events.map(({ _file, _speakers, ...raw }) => ({ ...raw, url_canonical: eventUrl(raw) }))));
write("events.jsonld", json(itemListJsonLd(events)));
write("events.ics", ics(events));
write("llms.txt", llmsTxt(events, now, speakers));
write("llms-full.txt", llmsFullTxt(events, now, speakers));

const mod = (e) => e.updated || `${e.lastVerified}T00:00:00Z`;
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  [`<url><loc>${SITE_URL}/</loc><lastmod>${now}</lastmod></url>`,
   `<url><loc>${SITE_URL}/speakers/</loc><lastmod>${now}</lastmod></url>`,
   ...events.map((e) => `<url><loc>${eventUrl(e)}</loc><lastmod>${mod(e)}</lastmod></url>`)].join("\n") + "\n</urlset>\n");
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

const byMod = [...events].sort((a, b) => mod(b).localeCompare(mod(a)));
write("feed.xml", `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n<title>${esc(SITE_NAME)}</title>\n<subtitle>${esc(INTRO)}</subtitle>\n<id>${SITE_URL}/</id>\n<link href="${SITE_URL}/"/>\n<link rel="self" href="${SITE_URL}/feed.xml"/>\n<updated>${byMod[0] ? mod(byMod[0]) : now}</updated>\n` +
  byMod.map((e) => `<entry><id>urn:uuid:${e.id}</id><title>${esc((e.status === "scheduled" ? "" : e.status.toUpperCase() + ": ") + e.name)}</title><link href="${eventUrl(e)}"/><updated>${mod(e)}</updated><summary>${esc(e.summary)} (${e.start} UTC)</summary></entry>`).join("\n") + "\n</feed>\n");

const rfc822 = (iso) => new Date(iso).toUTCString();
write("rss.xml", `<?xml version="1.0" encoding="utf-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n<title>${esc(SITE_NAME)}</title>\n<link>${SITE_URL}/</link>\n<description>${esc(INTRO)}</description>\n<language>en</language>\n<lastBuildDate>${rfc822(byMod[0] ? mod(byMod[0]) : now)}</lastBuildDate>\n<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>\n` +
  byMod.map((e) => `<item><title>${esc((e.status === "scheduled" ? "" : e.status.toUpperCase() + ": ") + e.name)}</title><link>${eventUrl(e)}</link><guid isPermaLink="false">urn:uuid:${e.id}:${e.revision || 0}</guid><pubDate>${rfc822(mod(e))}</pubDate><category>${esc(e.type)}</category><description>${esc(e.summary + " (" + e.start.replace("T", " ").slice(0, 16) + " UTC" + (e.status === "scheduled" ? "" : ", " + e.status) + ")")}</description></item>`).join("\n") + "\n</channel>\n</rss>\n");

write("404.html", `<!doctype html><meta charset="utf-8"><title>Not found</title><link rel="stylesheet" href="/assets/style.css"><body class="page"><main class="detail-page"><h1>not found</h1><p><a href="/">all events</a></p></main>`);
if (SITE_URL.startsWith("https://events.outerfab.com")) write("CNAME", "events.outerfab.com\n");
write(".nojekyll", "");
console.log(`✓ built ${events.length} event page(s) into ${path.relative(ROOT, OUT_DIR)}/ (${SITE_URL})`);
