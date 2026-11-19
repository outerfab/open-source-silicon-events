import { SITE_URL, SITE_NAME, eventUrl } from "./config.mjs";

const STATUS = {
  scheduled: "https://schema.org/EventScheduled",
  rescheduled: "https://schema.org/EventRescheduled",
  postponed: "https://schema.org/EventPostponed",
  cancelled: "https://schema.org/EventCancelled"
};
const MODE = {
  "in-person": "https://schema.org/OfflineEventAttendanceMode",
  online: "https://schema.org/OnlineEventAttendanceMode",
  hybrid: "https://schema.org/MixedEventAttendanceMode"
};

function place(e) {
  const l = e.location;
  const p = { "@type": "Place", name: l.name, address: { "@type": "PostalAddress", addressLocality: l.address.locality, addressCountry: l.address.country } };
  if (l.address.street) p.address.streetAddress = l.address.street;
  if (l.address.region) p.address.addressRegion = l.address.region;
  if (l.address.postalCode) p.address.postalCode = l.address.postalCode;
  if (l.geo) p.geo = { "@type": "GeoCoordinates", latitude: l.geo.lat, longitude: l.geo.lon };
  return p;
}

/** Canonical JSON-LD (schema.org/Event) generated from <uuid>.event.json. */
export function eventJsonLd(e, { context = true } = {}) {
  const j = {};
  if (context) j["@context"] = "https://schema.org";
  j["@type"] = "Event";
  j["@id"] = eventUrl(e);
  j.url = eventUrl(e);
  j.identifier = e.id;
  j.name = e.name;
  j.description = e.description ? `${e.summary}\n\n${e.description}` : e.summary;
  j.startDate = e.start;
  j.endDate = e.end;
  j.eventStatus = STATUS[e.status];
  j.eventAttendanceMode = MODE[e.mode];
  if (e.status === "rescheduled") j.previousStartDate = e.previousStart;
  const locs = [];
  if (e.location) locs.push(place(e));
  if (e.onlineUrl) locs.push({ "@type": "VirtualLocation", url: e.onlineUrl });
  if (locs.length) j.location = locs.length === 1 ? locs[0] : locs;
  j.organizer = e.organizers.map((o) => ({ "@type": "Organization", name: o.name, ...(o.url && { url: o.url }) }));
  if (e.speakers?.length) j.performer = e.speakers.map((s) => ({ "@type": "Person", name: s.name, ...(s.affiliation && { affiliation: { "@type": "Organization", name: s.affiliation } }), ...(s.url && { url: s.url }) }));
  j.inLanguage = e.languages.length === 1 ? e.languages[0] : e.languages;
  j.isAccessibleForFree = e.price.free;
  const offer = { "@type": "Offer", url: e.registration?.url || e.url, price: e.price.free ? 0 : e.price.minAmount, priceCurrency: e.price.currency || "EUR" };
  if (e.registration?.opensAt) offer.validFrom = e.registration.opensAt;
  if (e.registration?.closesAt) offer.validThrough = e.registration.closesAt;
  if (e.status === "cancelled") offer.availability = "https://schema.org/Discontinued";
  j.offers = offer;
  if (e.image) j.image = { "@type": "ImageObject", url: e.image.url, caption: e.image.alt };
  if (e.capacity) j.maximumAttendeeCapacity = e.capacity;
  if (e.topics?.length) j.keywords = e.topics.join(", ");
  j.about = { "@type": "Thing", name: "Open-source silicon" };
  const same = [e.url, ...(e.sameAs || [])];
  j.sameAs = same;
  if (e.series) j.superEvent = { "@type": "EventSeries", name: e.series };
  if (e.codeOfConductUrl) j.usageInfo = e.codeOfConductUrl;
  j.dateModified = e.updated || `${e.lastVerified}T00:00:00Z`;
  j.isPartOf = { "@type": "WebSite", name: SITE_NAME, url: SITE_URL + "/" };
  return j;
}

export function itemListJsonLd(events) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: SITE_NAME,
    url: SITE_URL + "/",
    numberOfItems: events.length,
    itemListElement: events.map((e, i) => ({ "@type": "ListItem", position: i + 1, url: eventUrl(e), item: eventJsonLd(e, { context: false }) }))
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL + "/",
    publisher: { "@type": "Organization", name: "Outerfab", url: "https://outerfab.com" }
  };
}

export const scriptTag = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
