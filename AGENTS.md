# AGENTS.md

Instructions for AI agents (and humans acting like one) who add or change events in this repository.
The repository is **public**. Everything you commit is world-readable and ends up on https://events.outerfab.com.

## What this repo is

Every event is one JSON file: `events/<yyyy>/<mm>/<uuid>.event.json`.
`npm run build` turns these files into the website, one canonical JSON-LD file per event, calendar files (`.ics`),
`llms.txt`, `llms-full.txt`, a feed and a sitemap. **Never edit anything in `dist/`. Never write JSON-LD, ICS or llms files by hand.**
The schema is `schema/event.schema.json`, the field reference is `schema/README.md`.

New events arrive as GitHub issues with the label `event` (form: `.github/ISSUE_TEMPLATE/event.yml`).
Changes, reschedules and cancellations arrive with the labels `event` and `event-update`.

## Hard rules

1. **UTC only.** `start`, `end`, `previousStart`, `previousEnd`, `registration.*At`, `cfp.deadline` and `updated` are UTC with a trailing `Z`
   (`2026-12-05T09:00:00Z`). Convert from local time yourself, and **confirm the converted time with the user**.
   `timezone` (IANA name, e.g. `Asia/Shanghai`) is only used to display the venue's local time next to UTC.
2. **Folder = month of `start` in UTC.** The file name is the `id`. If `start` moves into another month, move the file (`git mv`); the `id` never changes.
3. **Do not invent facts.** Every value must come from the user or from a source you fetched. Put that source in `source.url`
   and set `lastVerified` to today's date (UTC). If something is unknown, ask or leave the optional field out.
4. **No personal data.** No private e-mail addresses, phone numbers or home addresses. Speakers only by public name. No internal Outerfab information.
5. **Do not merge.** Open a pull request; a human reviews and merges.
6. `npm run validate` must pass before you commit.

## Adding a new event

1. Read the issue (`gh issue view <n> --repo outerfab/open-source-silicon-events`) or take the details from the user.
2. Ask the user for everything still missing. Ask in one batch, not one question at a time. Skip what is already known.

   **Required**
   1. What is the event called, and what is the official URL?
   2. Which type? One of: `conference`, `trade-show`, `meetup`, `workshop`, `hackathon`, `webinar`, `course`, `competition`, `tapeout-deadline`, `community-call`, `other`.
   3. When does it start and end, in which local time zone, and where is that time zone (IANA name)? (You convert to UTC and read it back.)
   4. In person, online or hybrid? In person/hybrid: venue name, city, country, optionally street, postal code and coordinates. Online/hybrid: the join URL.
   5. Who organizes it (name and URL)?
   6. Who is personally responsible for this event? (Public name, optional public URL and role. Exactly one person.)
   7. What language(s) is it held in?
   8. What does it cost? Free, or currency and min/max amount.
   9. Where was this information verified (URL)? That becomes `source`.
   10. Write a summary of one or two sentences (20–280 characters). Propose one, let the user correct it.

   **Ask, but optional**
   11. Is registration required? Link, opening and closing time (UTC).
   12. Is there a call for proposals? Link and deadline (UTC).
   13. Sponsors or location sponsor (name, URL, role), speakers (public names, affiliation; with a profile in `speakers/` if they consent, see "Adding a speaker"), series name, capacity, code of conduct URL, other pages of the same event (`sameAs`), image URL with alt text.
   14. Topics as kebab-case tags (see `schema/README.md`).
   15. A longer description (plain text, paragraphs separated by a blank line).

3. Create the file: `npm run new-event -- <start-utc>` prints the new UUID and path and writes a skeleton. Fill it in. Remove the `TODO` placeholders.
4. `npm run validate`, then `npm run preview` and look at the result if you can.
5. Branch `event/<short-slug>`, commit `Add event: <name>`, open a PR whose description contains `Closes #<issue>`. Do not merge.

## Adding a speaker

Speakers live in `speakers/<uuid>.speaker.json` (flat folder, no subfolders), schema `schema/speaker.schema.json`. New ones arrive as issues with the label `speaker` (`.github/ISSUE_TEMPLATE/speaker.yml`).
**Include a speaker only with public information and with their consent** (the event organizer or the speaker confirms it). Ask in one batch:

1. Full name as the speaker wants it shown, affiliation and role.
2. Does the speaker agree to a public profile? Who confirmed this?
3. A short bio of 1–3 factual sentences, from a public source. Never write a bio from guesses or private knowledge. Leave it out if unsure.
4. Public links (website, GitHub, ...). No e-mail, phone or home address.
5. Image URL (https) with alt text, topics (optional).
6. Where was this verified (URL)? That becomes `source`. Set `lastVerified` to today.

Create a UUID v4 (`node -e "console.log(crypto.randomUUID())"`), name the file `<uuid>.speaker.json`, run `npm run validate`.
In the event, reference the profile as `{"speakerId": "<uuid>", "talk": "..."}`. The build fails on unknown ids.
The same rules apply as for events: no invented facts, public repo, open a PR and do not merge.

## Changing an existing event

Find the file by `id`, URL or name (`grep -rl "<text>" events/`). Always:
increase `revision` by 1, set `updated` to the current UTC time, set `lastVerified` and update `source`.
The `revision` becomes SEQUENCE in the calendar file, so subscribers' calendars update instead of duplicating.

| Situation | What to set |
|---|---|
| **Rescheduled** (new date known) | `status: "rescheduled"`, `previousStart` and `previousEnd` = the old values, `start` and `end` = the new values, `statusNote` (why). Move the file if the month changed. |
| **Postponed** (no new date yet) | `status: "postponed"`, `statusNote`. Keep the old `start`/`end`. When a date is announced, switch to `rescheduled`. |
| **Cancelled** | `status: "cancelled"`, `statusNote`. Keep the event. Never delete it. |
| **Correction** (typo, wrong URL, wrong time) | Fix the field, bump `revision`. Status stays as it is. |
| **Back on** | `status: "scheduled"`, remove `statusNote` and `previousStart`/`previousEnd`. |

The site shows a red bar across the whole tile and strikes the old date through for every status except `scheduled`. That is intended.
Files are only deleted for duplicates and spam, and that is a decision for a human.

## Commands

    npm ci                 # install (once)
    npm run new-event -- 2026-12-05T09:00:00Z
    npm run validate       # schema + consistency checks, same as CI
    npm run build          # builds dist/
    npm run preview        # builds the fictional events in examples/ and serves http://localhost:8080

`EVENTS_DIR=examples SPEAKERS_DIR=examples/speakers npm run validate` checks the fictional examples.
`examples/` contains fictional events and speakers for previewing the layout. They are never published. Do not copy them into `events/`.
