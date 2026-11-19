// All stored times are UTC. Local time is only a secondary display.
const pad = (n) => String(n).padStart(2, "0");

export const utcDate = (iso) => iso.slice(0, 10);
export const utcTime = (iso) => iso.slice(11, 16);

function localParts(iso, tz) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "longOffset"
  });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  const off = (p.timeZoneName || "GMT").replace("GMT", "UTC") || "UTC";
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, off: off === "UTC" ? "UTC+00:00" : off };
}

/** "2026-11-19 09:00–17:00 UTC" or "2026-11-19 09:00 → 2026-11-21 17:00 UTC" */
export function rangeUtc(start, end) {
  const [d1, t1, d2, t2] = [utcDate(start), utcTime(start), utcDate(end), utcTime(end)];
  if (start === end) return `${d1} ${t1} UTC`;
  return d1 === d2 ? `${d1} ${t1}–${t2} UTC` : `${d1} ${t1} → ${d2} ${t2} UTC`;
}

/** Same range in the event's own time zone, e.g. "2026-11-19 17:00–01:00 Asia/Shanghai (UTC+08:00)" */
export function rangeLocal(start, end, tz) {
  const a = localParts(start, tz), b = localParts(end, tz);
  const label = `${tz} (${a.off})`;
  if (start === end) return `${a.date} ${a.time} ${label}`;
  return a.date === b.date ? `${a.date} ${a.time}–${b.time} ${label}` : `${a.date} ${a.time} → ${b.date} ${b.time} ${label}`;
}

export const stamp = (iso) => iso.replace(/[-:]/g, ""); // 20261119T090000Z
export const ymKey = (iso) => `${iso.slice(0, 4)}/${iso.slice(5, 7)}`;
export const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
export { pad };
