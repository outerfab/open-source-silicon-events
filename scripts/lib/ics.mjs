import { SITE_URL, SITE_NAME, eventUrl } from "./config.mjs";
import { stamp } from "./time.mjs";

const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function fold(line) {
  const out = [];
  let cur = "", bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

function vevent(e) {
  const loc = e.location
    ? [e.location.name, e.location.address.street, e.location.address.locality, e.location.address.country].filter(Boolean).join(", ")
    : e.onlineUrl;
  const status = { cancelled: "CANCELLED", postponed: "TENTATIVE" }[e.status] || "CONFIRMED";
  const prefix = { cancelled: "CANCELLED: ", postponed: "POSTPONED: " }[e.status] || "";
  const note = e.statusNote ? `${e.status.toUpperCase()}: ${e.statusNote}\n\n` : "";
  const desc = `${note}${e.summary}\n\nTimes are UTC.\n${e.url}\n${eventUrl(e)}`;
  const lines = [
    "BEGIN:VEVENT",
    `UID:${e.id}@${new URL(SITE_URL).hostname}`,
    `DTSTAMP:${stamp(e.updated || `${e.lastVerified}T00:00:00Z`)}`,
    `SEQUENCE:${e.revision || 0}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${esc(prefix + e.name)}`,
    `DESCRIPTION:${esc(desc)}`,
    `LOCATION:${esc(loc)}`,
    `URL:${e.url}`,
    `STATUS:${status}`,
    `CATEGORIES:${esc(e.type)}`,
    `LAST-MODIFIED:${stamp(e.updated || `${e.lastVerified}T00:00:00Z`)}`,
    "END:VEVENT"
  ];
  if (e.location?.geo) lines.splice(lines.length - 1, 0, `GEO:${e.location.geo.lat};${e.location.geo.lon}`);
  return lines;
}

export function ics(events, { name = SITE_NAME } = {}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Outerfab//Open Source Silicon Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
    "X-WR-TIMEZONE:UTC",
    ...events.flatMap(vevent),
    "END:VCALENDAR"
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
