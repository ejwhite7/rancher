import { test, expect } from "@playwright/test";
import {
  planSchedule,
  inPublishingWindow,
  zonedInstant,
} from "../scripts/corral/schedule.mjs";
test("schedule preserves partial-day order, weekend skipping and random validation", () => {
  const calls: number[][] = [];
  expect(
    planSchedule(["one", "two"], {
      startDay: "2026-10-31",
      random: (min, max) => {
        calls.push([min, max]);
        return calls.length - 1;
      },
    }),
  ).toEqual([
    {
      content_key: "one",
      local_date: "2026-11-02",
      window: "9:00–10:00",
      scheduled_at: "2026-11-02T14:00:00.000Z",
      timezone: "America/New_York",
    },
    {
      content_key: "two",
      local_date: "2026-11-02",
      window: "12:00–13:00",
      scheduled_at: "2026-11-02T17:01:00.000Z",
      timezone: "America/New_York",
    },
  ]);
  expect(calls).toEqual([
    [0, 60],
    [0, 60],
  ]);
  expect(
    planSchedule([], {
      startDay: "2026-10-31",
      random: () => {
        throw Error("unused");
      },
    }),
  ).toEqual([]);
  for (const minute of [-1, 60, 0.5, NaN, Infinity])
    expect(() =>
      planSchedule(["one"], { startDay: "2026-11-02", random: () => minute }),
    ).toThrow("Invalid random minute");
  expect(() => planSchedule([])).toThrow(
    "Explicit first eligible local date required",
  );
  expect(inPublishingWindow("invalid")).toBe(false);
});
test("Corral publishes once per window on weekdays and handles DST", () => {
  const slots = planSchedule(
    Array.from({ length: 24 }, (_, i) => `corral-${i + 1}`),
    { startDay: "2026-10-30", random: () => 37 },
  );
  expect(slots).toHaveLength(24);
  expect(new Set(slots.map((s) => s.scheduled_at)).size).toBe(24);
  for (const s of slots) expect(inPublishingWindow(s.scheduled_at)).toBe(true);
  expect(slots[0].scheduled_at).toBe("2026-10-30T13:37:00.000Z");
  expect(slots[3].scheduled_at).toBe("2026-11-02T14:37:00.000Z");
  expect(zonedInstant("2026-09-16", 16, 59)).toBe("2026-09-16T20:59:00.000Z");
  expect(inPublishingWindow("2026-09-19T13:30:00Z")).toBe(false);
  expect(inPublishingWindow("2026-09-16T14:00:00Z")).toBe(false);
  expect(inPublishingWindow("2026-09-16T13:00:00Z")).toBe(true);
  expect(() =>
    planSchedule(["one"], { startDay: "2026-09-16", random: () => 60 }),
  ).toThrow();
});
