# Event schema

`event.schema.json` (JSON Schema 2020-12) is the single source of truth. CI validates every event against it, plus the extra checks below.
Add `"$schema": "https://events.outerfab.com/schema/event.schema.json"` to a file to get completion in most editors.

## File rules

- Location: `events/<yyyy>/<mm>/<uuid>.event.json`, where `yyyy/mm` is the year and month of `start` **in UTC**.
- The file name must be `<id>.event.json`. `id` is a lowercase UUID v4 and never changes. Create one with `npm run new-event -- <start-utc>`.
- If `start` moves into another month, move the file; the `id` stays.
- Unknown properties are rejected.

## Fields

Times are always UTC with a trailing `Z`: `2026-12-05T09:00:00Z`.

| Field | Required | Description |
|---|---|---|
| `id` | yes | UUID v4 |
| `name` | yes | 3–140 characters |
| `summary` | yes | 20–280 characters, plain text. Shown in tiles, feeds, llms.txt |
| `description` | no | Plain text, paragraphs separated by a blank line |
| `type` | yes | `conference`, `trade-show`, `meetup`, `workshop`, `hackathon`, `webinar`, `course`, `competition`, `tapeout-deadline`, `community-call`, `other` |
| `topics` | no | Kebab-case tags, up to 15 |
| `series` | no | Name of the recurring series |
| `status` | yes | `scheduled`, `rescheduled`, `postponed`, `cancelled` |
| `statusNote` | if status ≠ `scheduled` | Why |
| `revision` | no | Integer, +1 on every change after publication. Becomes calendar `SEQUENCE` |
| `start`, `end` | yes | UTC. `end` must not be before `start`. For point-in-time events (deadlines) use a short window |
| `previousStart`, `previousEnd` | if status = `rescheduled` | The old UTC times, shown struck through |
| `timezone` | yes | IANA name of the venue (organizer for online events), e.g. `Asia/Shanghai`. Only used to display local time |
| `mode` | yes | `in-person`, `online`, `hybrid` |
| `location` | if mode ≠ `online` | `name`, `address` (`locality`, `country` ISO 3166-1 alpha-2; optional `street`, `region`, `postalCode`), optional `geo` (`lat`, `lon`) |
| `onlineUrl` | if mode ≠ `in-person` | Join link |
| `url` | yes | Official event page |
| `registration` | no | `required` (bool), `url`, `opensAt`, `closesAt` (UTC) |
| `cfp` | no | `url`, `deadline` (UTC), `note` |
| `price` | yes | `free` (bool); if not free: `currency` (ISO 4217), `minAmount`, optional `maxAmount`, `note` |
| `capacity` | no | Integer |
| `organizers` | yes | List of `{name, url?}` |
| `speakers` | no | List of `{name, affiliation?, url?}`. Public names only |
| `languages` | yes | BCP 47 tags, e.g. `en`, `zh-CN` |
| `image` | no | `{url (https), alt}` |
| `codeOfConductUrl`, `contactUrl` | no | Public pages only. No personal e-mail addresses in this public repo |
| `sameAs` | no | Other pages of the same event |
| `source` | yes | `{url, note?}` where the data was verified |
| `lastVerified` | yes | `YYYY-MM-DD` (UTC) |
| `updated` | no | UTC timestamp of the last content change |

## Consistency checks (beyond the schema)

- Folder and file name match `start` and `id`.
- No duplicate `id`.
- `rescheduled` needs `previousStart` and `previousEnd` that differ from the new times; `scheduled` must not have them.
- `timezone` is a valid IANA zone.
- Free events carry no amounts; `maxAmount ≥ minAmount`.

## Suggested topic tags

Not enforced, but reuse before inventing: `analog`, `digital`, `rtl`, `verification`, `openroad`, `yosys`, `librelane`, `sky130`, `gf180mcu`, `ihp-sg13g2`,
`mpw`, `tiny-tapeout`, `wafer-space`, `pdk`, `eda`, `post-fab`, `packaging`, `bonding`, `test`, `education`, `community`, `fpga`, `risc-v`.

## What is generated from an event

| Output | Source of truth |
|---|---|
| `event.jsonld` | schema.org `Event` (`eventStatus`, `eventAttendanceMode`, `previousStartDate`, `Place` or `VirtualLocation`, `Offer`, ...) |
| `event.ics` | `VEVENT` with UTC times, `STATUS` (`CANCELLED`, `TENTATIVE`, `CONFIRMED`) and `SEQUENCE` = `revision` |
| `event.md`, `llms.txt`, `llms-full.txt` | Markdown for agents |
| `events/<uuid>/index.html` and the modal | The human view |
