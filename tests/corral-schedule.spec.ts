import { test, expect } from "@playwright/test";
import {
  planSchedule,
  inPublishingWindow,
  zonedInstant,
} from "../scripts/corral/schedule.mjs";
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
