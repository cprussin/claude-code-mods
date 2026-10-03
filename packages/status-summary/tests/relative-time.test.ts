import { expect, test } from "bun:test";
import { formatAge } from "../src/relative-time";

const NOW = new Date("2026-10-03T12:00:00Z");

test.each([
  ["2026-10-03T11:59:30Z", "just now"],
  ["2026-10-03T11:55:00Z", "5m ago"],
  ["2026-10-03T09:00:00Z", "3h ago"],
  ["2026-09-30T12:00:00Z", "3d ago"],
])("%s is %s", (iso, label) => {
  expect(formatAge(new Date(iso), NOW)).toBe(label);
});
