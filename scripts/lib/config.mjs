import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const SITE_URL = (process.env.SITE_URL || "https://events.outerfab.com").replace(/\/$/, "");
export const SITE_NAME = "Open Source Silicon Events";
export const REPO_URL = "https://github.com/outerfab/open-source-silicon-events";
export const EVENTS_DIR = path.resolve(ROOT, process.env.EVENTS_DIR || "events");
export const OUT_DIR = path.join(ROOT, "dist");
export const INTRO =
  "A curated, open calendar of meetups, conferences, workshops, shuttle deadlines and other events around open-source silicon. All times are UTC.";
export const TYPE_LABELS = {
  conference: "conference", "trade-show": "trade show", meetup: "meetup", workshop: "workshop",
  hackathon: "hackathon", webinar: "webinar", course: "course", competition: "competition",
  "tapeout-deadline": "tapeout deadline", "community-call": "community call", other: "other"
};
export const STATUS_LABELS = {
  scheduled: "scheduled", rescheduled: "rescheduled", postponed: "postponed", cancelled: "cancelled"
};
export const eventUrl = (e) => `${SITE_URL}/events/${e.id}/`;
