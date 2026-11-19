import { SITE_URL, SITE_NAME, REPO_URL, INTRO, TYPE_LABELS, STATUS_LABELS, eventUrl } from "./config.mjs";
import { rangeUtc, rangeLocal } from "./time.mjs";
import { itemListJsonLd, websiteJsonLd, eventJsonLd, scriptTag } from "./jsonld.mjs";
import { speakerJsonLd } from "./speakers.mjs";

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const link = (u, t) => `<a href="${esc(u)}" rel="noopener">${esc(t ?? u.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>`;
const paras = (t) => t.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
const dead = (e) => e.status === "cancelled" || e.status === "postponed";

const BANNER = {
  cancelled: (e) => "cancelled",
  postponed: (e) => "postponed · new date to be announced",
  rescheduled: (e) => `rescheduled · was ${rangeUtc(e.previousStart, e.previousEnd)}`
};
export const banner = (e) => e.status === "scheduled" ? "" : `<div class="banner" role="status">${esc(BANNER[e.status](e))}</div>`;

function when(e, { compact = false } = {}) {
  const struck = dead(e) ? " struck" : "";
  const old = e.status === "rescheduled" ? `<p class="old"><s>${esc(rangeUtc(e.previousStart, e.previousEnd))}</s></p>` : "";
  return `<div class="when">${old}<p class="utc${struck}"><time datetime="${e.start}">${esc(rangeUtc(e.start, e.end))}</time></p>` +
    `<p class="local${struck}">${esc(rangeLocal(e.start, e.end, e.timezone))}</p></div>`;
}

const place = (e) => {
  const bits = [];
  if (e.location) bits.push(`${esc(e.location.name)}, ${esc(e.location.address.locality)}, ${esc(e.location.address.country)}`);
  if (e.mode === "online") bits.push("online");
  if (e.mode === "hybrid") bits.push("hybrid · also online");
  return bits.join(" · ");
};

const chips = (e) => `<div class="chips"><span class="chip type">${esc(TYPE_LABELS[e.type])}</span><span class="chip">${esc(e.mode)}</span>` +
  (e.price.free ? `<span class="chip">free</span>` : "") + `</div>`;

const icsBtn = (e, base, cls = "") => `<a class="btn ${cls}" href="${base}events/${e.id}/event.ics" download="${e.id}.ics">add to calendar</a>`;

/** One tile in the overview. */
export function tile(e) {
  const search = [e.name, e.summary, e.type, e.mode, e.topics?.join(" "), e.series, e.location?.address.locality, e.location?.address.country, e.organizers.map((o) => o.name).join(" "), e.responsibleOrganizer.name, (e._speakers || e.speakers || []).map((s) => s.name).join(" ")].filter(Boolean).join(" ").toLowerCase();
  return `<article class="tile s-${e.status}" id="tile-${e.id}" data-id="${e.id}" data-start="${e.start}" data-end="${e.end}" data-type="${e.type}" data-mode="${e.mode}" data-status="${e.status}" data-search="${esc(search)}">
${banner(e)}
<div class="tile-body">
${chips(e)}
<h2><a class="open" href="events/${e.id}/">${esc(e.name)}</a></h2>
${when(e)}
<p class="where">${place(e)}</p>
<p class="sum">${esc(e.summary)}</p>
</div>
<div class="tile-actions"><a class="btn ghost open" href="events/${e.id}/">details</a>${icsBtn(e, "")}</div>
</article>`;
}

const row = (k, v) => v ? `<div class="row"><dt>${k}</dt><dd>${v}</dd></div>` : "";

/** Detail view, used in the modal (base "") and on the static page (base "../../"). */
export function detail(e, base) {
  const addr = e.location ? [e.location.name, e.location.address.street, [e.location.address.postalCode, e.location.address.locality].filter(Boolean).join(" "), e.location.address.region, e.location.address.country].filter(Boolean).map(esc).join("<br>") : "";
  const geo = e.location?.geo ? ` <a href="https://www.openstreetmap.org/?mlat=${e.location.geo.lat}&mlon=${e.location.geo.lon}#map=15/${e.location.geo.lat}/${e.location.geo.lon}" rel="noopener">map</a>` : "";
  const price = e.price.free ? "free" : `${e.price.minAmount}${e.price.maxAmount && e.price.maxAmount !== e.price.minAmount ? "–" + e.price.maxAmount : ""} ${esc(e.price.currency)}`;
  const reg = e.registration ? (e.registration.required ? "required" : "not required") + (e.registration.url ? ` · ${link(e.registration.url, "register")}` : "") +
    (e.registration.opensAt ? `<br>opens ${esc(e.registration.opensAt.replace("T", " ").slice(0, 16))} UTC` : "") +
    (e.registration.closesAt ? `<br>closes ${esc(e.registration.closesAt.replace("T", " ").slice(0, 16))} UTC` : "") : "";
  const cfp = e.cfp ? `${link(e.cfp.url, "submit")} · deadline ${esc(e.cfp.deadline.replace("T", " ").slice(0, 16))} UTC${e.cfp.note ? "<br>" + esc(e.cfp.note) : ""}` : "";
  const note = e.statusNote ? `<p class="note"><strong>${esc(STATUS_LABELS[e.status])}:</strong> ${esc(e.statusNote)}</p>` : "";
  return `${banner(e)}
<div class="detail-body">
<div class="eyebrow">${esc(TYPE_LABELS[e.type])}${e.series ? " · " + esc(e.series) : ""}</div>
<h1 class="detail-title">${esc(e.name)}</h1>
${chips(e)}
${note}
${when(e)}
<p class="lead">${esc(e.summary)}</p>
${e.description ? `<div class="desc">${paras(e.description)}</div>` : ""}
<dl class="facts">
${row("where", [addr ? addr + geo : "", e.onlineUrl ? `online: ${link(e.onlineUrl)}` : ""].filter(Boolean).join("<br>"))}
${row("official page", link(e.url))}
${row("registration", reg)}
${row("call for proposals", cfp)}
${row("price", price + (e.price.note ? `<br>${esc(e.price.note)}` : ""))}
${row("capacity", e.capacity ? String(e.capacity) : "")}
${row("languages", esc(e.languages.join(", ")))}
${row("organizers", e.organizers.map((o) => o.url ? link(o.url, o.name) : esc(o.name)).join(", "))}
${row("responsible", (e.responsibleOrganizer.url ? link(e.responsibleOrganizer.url, e.responsibleOrganizer.name) : esc(e.responsibleOrganizer.name)) + (e.responsibleOrganizer.role ? ` (${esc(e.responsibleOrganizer.role)})` : ""))}
${row("speakers", (e._speakers || e.speakers || []).map((s) => (s.speakerId ? `<a href="${base}speakers/#${s.speakerId}">${esc(s.name)}</a>` : s.url ? link(s.url, s.name) : esc(s.name)) + (s.affiliation ? ` (${esc(s.affiliation)})` : "") + (s.talk ? `<br><em>${esc(s.talk)}</em>` : "")).join("<br>"))}
${row("topics", (e.topics || []).map((t) => `<span class="chip">${esc(t)}</span>`).join(" "))}
${row("code of conduct", e.codeOfConductUrl ? link(e.codeOfConductUrl) : "")}
${row("also on", (e.sameAs || []).map((u) => link(u)).join("<br>"))}
${row("source", `${link(e.source.url)}${e.source.note ? "<br>" + esc(e.source.note) : ""}<br>verified ${esc(e.lastVerified)}`)}
</dl>
<div class="detail-actions">${icsBtn(e, base, "primary")}
<a class="btn ghost" href="${base}events/${e.id}/event.jsonld">json-ld</a>
<a class="btn ghost" href="${base}events/${e.id}/event.json">json</a>
<a class="btn ghost" href="${base}events/${e.id}/event.md">markdown</a></div>
<p class="permalink"><a href="${base}events/${e.id}/">permalink</a> · <a href="${REPO_URL}/issues/new?template=event-update.yml&title=${encodeURIComponent("Update: " + e.name)}" rel="noopener">report a change</a></p>
</div>`;
}

const head = ({ title, desc, canonical, base, ld, extra = "" }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#111111">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="text/calendar" title="All events (iCalendar)" href="${base}events.ics">
<link rel="alternate" type="application/atom+xml" title="Atom feed" href="${base}feed.xml">
<link rel="alternate" type="text/plain" title="llms.txt" href="${base}llms.txt">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="${base}assets/style.css">
${extra}${ld}
</head>`;

const top = (base) => `<header class="top"><a class="brand" href="${base || "./"}" aria-label="${esc(SITE_NAME)}">${LOGO_INLINE}</a>
<span class="crumb">open source silicon events</span>
<nav><a href="${REPO_URL}/issues/new?template=event.yml" rel="noopener">submit an event</a><a href="${base}speakers/">speakers</a><a href="${base}events.ics">subscribe</a><a href="${base}llms.txt">llms.txt</a><a href="${REPO_URL}" rel="noopener">github</a></nav></header>`;

const foot = (base) => `<footer class="foot"><p>All times are UTC. Event data is CC0, curated in the <a href="${REPO_URL}" rel="noopener">open repository</a>. Maintained by <a href="https://outerfab.com" rel="noopener">outerfab</a>.</p>
<p><a href="${base}events.ics">events.ics</a> · <a href="${base}events.json">events.json</a> · <a href="${base}events.jsonld">events.jsonld</a> · <a href="${base}feed.xml">feed.xml</a> · <a href="${base}llms.txt">llms.txt</a> · <a href="${base}schema/event.schema.json">schema</a></p></footer>`;

let LOGO_INLINE = "";
export const setLogo = (svg) => { LOGO_INLINE = svg.replace(/<\?xml[^>]*\?>/, "").trim(); };

export function indexPage(events) {
  const tpls = events.map((e) => `<template id="tpl-${e.id}">${detail(e, "")}</template>`).join("\n");
  const types = [...new Set(events.map((e) => e.type))].sort();
  return `${head({ title: `${SITE_NAME} · outerfab`, desc: INTRO, canonical: SITE_URL + "/", base: "", ld: scriptTag(websiteJsonLd()) + scriptTag(itemListJsonLd(events)) })}
<body>
${top("")}
<main>
<section class="hero">
<div class="eyebrow">outerfab · community calendar</div>
<h1>open source silicon events</h1>
<p>${esc(INTRO)}</p>
</section>
<section class="controls" aria-label="filters">
<input id="q" type="search" placeholder="search events" aria-label="search events" autocomplete="off">
<select id="f-type" aria-label="type"><option value="">all types</option>${types.map((t) => `<option value="${t}">${esc(TYPE_LABELS[t])}</option>`).join("")}</select>
<select id="f-mode" aria-label="mode"><option value="">in person &amp; online</option><option value="in-person">in person</option><option value="online">online</option><option value="hybrid">hybrid</option></select>
<div class="seg" role="group" aria-label="time"><button type="button" data-view="upcoming" aria-pressed="true">upcoming</button><button type="button" data-view="past" aria-pressed="false">past</button><button type="button" data-view="all" aria-pressed="false">all</button></div>
</section>
<p id="count" class="count" aria-live="polite"></p>
<section id="grid" class="grid">
${events.map(tile).join("\n")}
</section>
<p id="empty" class="empty" ${events.length ? "hidden" : ""}>${events.length ? "No events match." : "No events yet. <a href=\"" + REPO_URL + "/issues/new?template=event.yml\">Submit the first one.</a>"}</p>
</main>
${foot("")}
<dialog id="modal" aria-label="event details"><button class="close" type="button" aria-label="close">×</button><div id="modal-body"></div></dialog>
${tpls}
<script src="assets/app.js" defer></script>
</body>
</html>
`;
}

export function eventPage(e) {
  const base = "../../";
  return `${head({ title: `${e.name} · ${SITE_NAME}`, desc: e.summary, canonical: eventUrl(e), base, ld: scriptTag(eventJsonLd(e)) })}
<body class="page">
${top(base)}
<main class="detail-page">
<article class="detail s-${e.status}">
${detail(e, base)}
</article>
<p class="back"><a href="${base}#${e.id}">← all events</a></p>
</main>
${foot(base)}
</body>
</html>
`;
}

const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

function speakerCard(s) {
  const sub = [s.role, s.affiliation].filter(Boolean).map(esc).join(" · ");
  const evs = s._events.map(({ event, talk }) => `<li><a href="../events/${event.id}/">${esc(event.name)}</a> <span class="dim">${esc(event.start.slice(0, 10))}</span>${talk ? `<br><em>${esc(talk)}</em>` : ""}</li>`).join("");
  return `<article class="speaker" id="${s.id}">
<div class="avatar" aria-hidden="${s.image ? "false" : "true"}">${s.image ? `<img src="${esc(s.image.url)}" alt="${esc(s.image.alt)}" loading="lazy">` : esc(initials(s.name))}</div>
<div class="speaker-body">
<h2><a href="#${s.id}">${esc(s.name)}</a></h2>
${sub ? `<p class="eyebrow">${sub}</p>` : ""}
${s.bio ? `<p>${esc(s.bio)}</p>` : ""}
${s.topics?.length ? `<div class="chips">${s.topics.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>` : ""}
${s.links?.length ? `<p class="links">${s.links.map((l) => link(l.url, l.label)).join(" · ")}</p>` : ""}
${evs ? `<h3>events</h3><ul class="speaker-events">${evs}</ul>` : ""}
<p class="permalink"><a href="${esc(`${SITE_URL}/speakers/${s.id}.jsonld`)}">json-ld</a> · <a href="${SITE_URL}/speakers/${s.id}.json">json</a> · <span class="dim">verified ${esc(s.lastVerified)}</span> · ${link(s.source.url, "source")}</p>
</div>
</article>`;
}

export function speakersPage(speakers) {
  const ld = scriptTag({ "@context": "https://schema.org", "@type": "ItemList", name: "Speakers · " + SITE_NAME, url: SITE_URL + "/speakers/", numberOfItems: speakers.length,
    itemListElement: speakers.map((s, i) => ({ "@type": "ListItem", position: i + 1, item: speakerJsonLd(s, { context: false }) })) });
  return `${head({ title: `Speakers · ${SITE_NAME}`, desc: "People who speak at open-source silicon events listed here.", canonical: SITE_URL + "/speakers/", base: "../", ld })}
<body class="page">
${top("../")}
<main>
<section class="hero">
<div class="eyebrow">outerfab · community calendar</div>
<h1>speakers</h1>
<p>People who speak at the events in this calendar. Profiles contain public information only and are published with the speaker's consent.</p>
</section>
<section class="speakers">
${speakers.length ? speakers.map(speakerCard).join("\n") : '<p class="empty">No speaker profiles yet.</p>'}
</section>
<p class="back"><a href="../">← all events</a></p>
</main>
${foot("../")}
</body>
</html>
`;
}
