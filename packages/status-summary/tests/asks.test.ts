import { expect, test } from "bun:test";
import { openAsks } from "../src/asks";
import type { Session } from "../src/sessions";
import { SessionStatus } from "../src/sessions";

const session = (id: string, ask: string | undefined): Session => ({
  ask,
  detail: undefined,
  id,
  repo: undefined,
  status: SessionStatus.Waiting,
  title: id,
  unread: false,
  updatedAt: "2026-10-01T12:00:00Z",
  url: `https://claude.ai/code/${id}`,
});

test("lists asks not dismissed, and re-lists a session whose ask changed", () => {
  const sessions = [
    session("quiet", undefined),
    session("new", "Approve the plan"),
    session("dismissed", "Add the secret"),
    session("changed", "Deploy the app"),
  ];
  expect(
    openAsks(sessions, { changed: "Old ask", dismissed: "Add the secret" }).map(
      (s) => s.id,
    ),
  ).toEqual(["new", "changed"]);
});
