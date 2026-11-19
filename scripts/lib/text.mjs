import { SITE_URL, SITE_NAME, REPO_URL, INTRO, TYPE_LABELS, eventUrl } from "./config.mjs";
import { rangeUtc, rangeLocal, utcDate } from "./time.mjs";

export function where(e) {
  const parts = [];
  if (e.location) parts.push(`${e.location.name}, ${e.location.address.locality}, ${e.location.address.country}`);
  if (e.mode !== "in-person") parts.push(e.mode === "online" ? "online" : "also online");
  return parts.join(" · ");
}

const statusLine = (e) => e.status === "scheduled" ? "" : `**${e.status.toUpperCase()}**: ${e.statusNote}`;
const priceText = (p) => p.free ? "free" : `${p.minAmount}${p.maxAmount && p.maxAmount !== p.minAmount ? "–" + p.maxAmount : ""} ${p.currency}${p.note ? " (" + p.note + ")" : ""}`;

/** Markdown rendition of one event (events/<uuid>/event.md and llms-full.txt). */
export function eventMarkdown(e, { heading = 1 } = {}) {
  const h = "#".repeat(heading);
  const L = [`${h} ${e.name}`, ""];
  if (e.status !== "scheduled") L.push(`> ${statusLine(e)}`, "");
  L.push(e.summary, "");
  if (e.description) L.push(e.description, "");
  const old = e.status === "rescheduled" ? `~~${rangeUtc(e.previousStart, e.previousEnd)}~~ → ` : "";
  const startTxt = ["cancelled", "postponed"].includes(e.status) ? `~~${rangeUtc(e.start, e.end)}~~` : rangeUtc(e.start, e.end);
  L.push(`- **When (UTC):** ${old}${startTxt}`);
  L.push(`- **Local time at the event:** ${rangeLocal(e.start, e.end, e.timezone)}`);
  L.push(`- **Type:** ${TYPE_LABELS[e.type]}`);
  L.push(`- **Status:** ${e.status}`);
  L.push(`- **Mode:** ${e.mode}`);
  if (e.location) L.push(`- **Where:** ${[e.location.name, e.location.address.street, e.location.address.postalCode, e.location.address.locality, e.location.address.region, e.location.address.country].filter(Boolean).join(", ")}`);
  if (e.onlineUrl) L.push(`- **Join online:** ${e.onlineUrl}`);
  L.push(`- **Official page:** ${e.url}`);
  if (e.registration) L.push(`- **Registration:** ${e.registration.required ? "required" : "not required"}${e.registration.url ? ", " + e.registration.url : ""}${e.registration.closesAt ? ", closes " + e.registration.closesAt : ""}`);
  if (e.cfp) L.push(`- **Call for proposals:** ${e.cfp.url}, deadline ${e.cfp.deadline}`);
  L.push(`- **Price:** ${priceText(e.price)}`);
  L.push(`- **Languages:** ${e.languages.join(", ")}`);
  L.push(`- **Organizers:** ${e.organizers.map((o) => o.name).join(", ")}`);
  L.push(`- **Responsible organizer:** ${e.responsibleOrganizer.name}${e.responsibleOrganizer.role ? ` (${e.responsibleOrganizer.role})` : ""}${e.responsibleOrganizer.url ? ", " + e.responsibleOrganizer.url : ""}`);
  if (e.speakers?.length) L.push(`- **Speakers:** ${e.speakers.map((s) => s.name + (s.affiliation ? ` (${s.affiliation})` : "")).join(", ")}`);
  if (e.topics?.length) L.push(`- **Topics:** ${e.topics.join(", ")}`);
  if (e.series) L.push(`- **Series:** ${e.series}`);
  L.push(`- **Source:** ${e.source.url} (verified ${e.lastVerified})`);
  L.push(`- **Canonical page:** ${eventUrl(e)}`);
  L.push(`- **Calendar file:** ${eventUrl(e)}event.ics`);
  L.push(`- **JSON-LD:** ${eventUrl(e)}event.jsonld`);
  L.push("");
  return L.join("\n");
}

function bullet(e) {
  const flag = e.status === "scheduled" ? "" : ` [${e.status.toUpperCase()}]`;
  return `- [${e.name}](${eventUrl(e)}event.md)${flag}: ${rangeUtc(e.start, e.end)} · ${TYPE_LABELS[e.type]} · ${where(e)}. ${e.summary}`;
}

export function split(events, now) {
  const upcoming = events.filter((e) => e.end >= now);
  const past = events.filter((e) => e.end < now).reverse();
  return { upcoming, past };
}

export function llmsTxt(events, now) {
  const { upcoming, past } = split(events, now);
  const L = [
    `# ${SITE_NAME}`, "",
    `> ${INTRO} Maintained by Outerfab. Every event is a JSON file in the public repository; this site, the JSON-LD, the calendar files and this document are generated from those files.`, "",
    "Conventions: all timestamps are UTC (ISO 8601 with Z). Each event also states the local time of its venue. Status is one of scheduled, rescheduled, postponed, cancelled; changed events are marked. Prefer the per-event `.md` and `.jsonld` files over scraping HTML.", "",
    "## Upcoming events", "",
    ...(upcoming.length ? upcoming.map(bullet) : ["No upcoming events are listed right now."]), "",
    "## Past events", "",
    ...(past.length ? past.map(bullet) : ["None yet."]), "",
    "## Machine-readable data", "",
    `- [events.json](${SITE_URL}/events.json): all events as one JSON array`,
    `- [events.jsonld](${SITE_URL}/events.jsonld): schema.org ItemList of all events`,
    `- [events.ics](${SITE_URL}/events.ics): iCalendar feed of all events (subscribe in Apple, Google or any calendar app)`,
    `- [feed.xml](${SITE_URL}/feed.xml): Atom feed`,
    `- [event.schema.json](${SITE_URL}/schema/event.schema.json): JSON Schema of an event`,
    `- [sitemap.xml](${SITE_URL}/sitemap.xml)`, "",
    "## Contribute", "",
    `- [Submit an event](${REPO_URL}/issues/new?template=event.yml): open an issue with the \`event\` label`,
    `- [Repository](${REPO_URL}): source, schema and contribution rules (AGENTS.md)`, "",
    "## Optional", "",
    `- [llms-full.txt](${SITE_URL}/llms-full.txt): every event in full, as Markdown`, ""
  ];
  return L.join("\n");
}

export function llmsFullTxt(events, now) {
  const { upcoming, past } = split(events, now);
  const L = [`# ${SITE_NAME}`, "", `> ${INTRO}`, "", `Generated from ${events.length} event file(s). All timestamps are UTC.`, "", "## Upcoming events", ""];
  L.push(...(upcoming.length ? upcoming.flatMap((e) => [eventMarkdown(e, { heading: 3 }), "---", ""]) : ["No upcoming events are listed right now.", ""]));
  L.push("## Past events", "");
  L.push(...(past.length ? past.flatMap((e) => [eventMarkdown(e, { heading: 3 }), "---", ""]) : ["None yet.", ""]));
  return L.join("\n");
}
export { utcDate };
