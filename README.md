# Open Source Silicon Events

A curated, open calendar of meetups, conferences, workshops, shuttle deadlines and other events around open-source silicon.
Live at **https://events.outerfab.com** (GitHub Pages). Maintained by [Outerfab](https://outerfab.com).

> **Status:** Public. Event data is CC0, code is MIT. See [LICENSE](LICENSE).

## What you get

| URL | What |
|---|---|
| `/` | Overview with one tile per event, filters, detail modal, "add to calendar" button |
| `/events/<uuid>/` | Static detail page, includes canonical JSON-LD |
| `/events/<uuid>/event.jsonld` | Canonical schema.org `Event` JSON-LD |
| `/events/<uuid>/event.json` | The source JSON |
| `/events/<uuid>/event.ics` | Calendar file for Apple Calendar, Google Calendar, Outlook |
| `/events/<uuid>/event.md` | Markdown rendition, for agents |
| `/speakers/` | Speaker profiles (cards, anchors `#<uuid>`), with the events each speaker is listed at |
| `/speakers.json`, `/speakers/<uuid>.json`, `/speakers/<uuid>.jsonld` | All speakers, one speaker, canonical schema.org `Person` JSON-LD |
| `/events.ics` | Subscribable calendar of all events |
| `/events.json`, `/events.jsonld` | All events in one file |
| `/llms.txt`, `/llms-full.txt` | Index and full text for LLMs |
| `/feed.xml`, `/sitemap.xml` | Atom feed, sitemap |
| `/schema/event.schema.json` | JSON Schema |

Everything is generated from the files in `events/`. Nothing in the output is written by hand.

## Times

**UTC is the source of truth.** All timestamps in the JSON are UTC with a trailing `Z`. The site shows UTC first and,
below it, the local time at the event (from the event's IANA `timezone`).

## Add an event

1. [Open an issue with the form "New event"](../../issues/new?template=event.yml). It gets the label `event`.
2. A maintainer, or an AI agent following [AGENTS.md](AGENTS.md), turns it into a file `events/<yyyy>/<mm>/<uuid>.event.json`
   (`yyyy/mm` is the month of `start` in UTC) and opens a pull request with `Closes #<issue>`.
3. A human reviews and merges. The site is deployed automatically.

Changes, reschedules and cancellations use the form "Change, reschedule or cancel an event" (labels `event`, `event-update`).
A changed event keeps its UUID and stays on the site. It is marked with a **red bar across the whole tile**, and the old date is struck through.

Every event names one **responsible organizer** (`responsibleOrganizer`: a person's public name, optionally a public URL and role; never an e-mail address or phone number).

Letting an agent do it: tell it "add this event" and give it the issue number or the link. `AGENTS.md` tells it which questions to ask you and how to write the file.

## Add a speaker

Speakers have profiles in `speakers/<uuid>.speaker.json` (flat folder). [Open an issue with the form "New speaker profile"](../../issues/new?template=speaker.yml) (label `speaker`).
Profiles contain public information only and are published with the speaker's consent. Events reference a profile with `{"speakerId": "<uuid>"}`;
the build fails if the id does not exist. Events may still list a speaker inline by name.

Field reference and rules: [schema/README.md](schema/README.md).

## Event types

The `type` field is one of:

| Value | Meaning |
|---|---|
| `conference` | Multi-track conference or summit |
| `trade-show` | Exhibition or trade fair |
| `meetup` | Local community meetup |
| `workshop` | Hands-on session |
| `hackathon` | Build event, design sprint |
| `webinar` | Online talk or presentation |
| `course` | Multi-session course or training |
| `competition` | Design contest or challenge |
| `tapeout-deadline` | Submission deadline of a shuttle or multi-project wafer run |
| `community-call` | Recurring open call |
| `other` | Anything else relevant to open-source silicon |

## Event status

| Value | Display |
|---|---|
| `scheduled` | normal |
| `rescheduled` | red bar, old date struck through, new date shown |
| `postponed` | red bar, date struck through, "new date to be announced" |
| `cancelled` | red bar, date struck through |

## Develop

Requires Node.js 20 or newer.

    npm ci
    npm run validate       # same checks as CI
    npm run build          # writes dist/
    npm run preview        # builds the fictional events from examples/ and serves http://localhost:8080
    npm run new-event -- 2026-12-05T09:00:00Z   # scaffolds a new event file

`examples/` holds fictional events for layout previews. They are not published.

CI (`.github/workflows/pages.yml`) validates every push and pull request and deploys `main` to GitHub Pages. A daily run refreshes the "upcoming" and "past" sections of `llms.txt`.

## Custom domain

The site is served at `events.outerfab.com`. DNS needs a `CNAME` record `events` → `outerfab.github.io`.
