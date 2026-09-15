import { randomInt } from "node:crypto";
export const schedulePolicy = {
  timezone: "America/New_York",
  weekdays: [1, 2, 3, 4, 5],
  windows: [
    { start: 9, end: 10 },
    { start: 12, end: 13 },
    { start: 16, end: 17 },
  ],
  posts_per_window: 1,
};
const parts = (date, timezone) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
export function zonedInstant(
  day,
  hour,
  minute,
  timezone = schedulePolicy.timezone,
) {
  const target = Date.parse(
    `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`,
  );
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = parts(new Date(guess), timezone);
    const local = Date.parse(
      `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`,
    );
    guess += target - local;
  }
  return new Date(guess).toISOString();
}
/** @param {string[]} keys @param {{startDay?: string, random?: (min: number, max: number) => number}} options */
export function planSchedule(keys, { startDay, random = randomInt } = {}) {
  if (!startDay || !/^\d{4}-\d{2}-\d{2}$/.test(startDay))
    throw Error("Explicit first eligible local date required");
  const day = new Date(startDay + "T12:00:00Z"),
    slots = [];
  while (slots.length < keys.length) {
    if (schedulePolicy.weekdays.includes(day.getUTCDay()))
      for (const window of schedulePolicy.windows) {
        if (slots.length === keys.length) break;
        const minute = random(0, 60);
        if (!Number.isInteger(minute) || minute < 0 || minute > 59)
          throw Error("Invalid random minute");
        const localDay = day.toISOString().slice(0, 10);
        slots.push({
          content_key: keys[slots.length],
          local_date: localDay,
          window: `${window.start}:00–${window.end}:00`,
          scheduled_at: zonedInstant(localDay, window.start, minute),
          timezone: schedulePolicy.timezone,
        });
      }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return slots;
}
export function inPublishingWindow(instant) {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) return false;
  const p = parts(date, schedulePolicy.timezone);
  const weekday = new Date(
    `${p.year}-${p.month}-${p.day}T12:00:00Z`,
  ).getUTCDay();
  return (
    schedulePolicy.weekdays.includes(weekday) &&
    schedulePolicy.windows.some((w) => +p.hour === w.start)
  );
}
