import { describe, expect, test } from "bun:test";
import { parseSessions, SessionStatus } from "../src/sessions";

const session = (overrides: Record<string, unknown>) => ({
  id: "session_1",
  session_status: "SESSION_STATUS_IDLE",
  status_bucket: "SESSION_STATUS_BUCKET_COMPLETED",
  title: "Fix the build",
  updated_at: "2026-10-01T12:00:00Z",
  ...overrides,
});

const summary = (fields: Record<string, string>) => ({
  external_metadata: {
    post_turn_summary: {
      needs_action: "",
      recent_action: "",
      status_category: "completed",
      status_detail: "",
      ...fields,
    },
  },
});

const parseOne = (overrides: Record<string, unknown>) =>
  parseSessions({ ccr: { data: [session(overrides)] } })[0];

describe("parseSessions", () => {
  test("drops archived sessions", () => {
    expect(
      parseSessions({
        ccr: {
          data: [
            session({ id: "a", session_status: "SESSION_STATUS_ARCHIVED" }),
            session({ id: "b" }),
          ],
        },
      }).map((s) => s.id),
    ).toEqual(["b"]);
  });

  test("accepts the payload as JSON text", () => {
    expect(
      parseSessions(JSON.stringify({ ccr: { data: [session({})] } })),
    ).toHaveLength(1);
  });

  test("throws on a payload that is not a session list", () => {
    expect(() => parseSessions({ data: "nope" })).toThrow();
  });

  test("links to the session and fills in its repo and branch", () => {
    expect(
      parseOne({
        session_context: {
          outcomes: [
            {
              git_repository: {
                git_info: { branches: ["fix-build"], repo: "me/app" },
              },
            },
          ],
        },
        unread: true,
      }),
    ).toMatchObject({
      repo: "me/app · fix-build",
      unread: true,
      url: "https://claude.ai/code/session_1",
    });
  });

  test("falls back to the source repo URL when there is no outcome", () => {
    expect(
      parseOne({
        session_context: {
          sources: [{ git_repository: { url: "https://github.com/me/other" } }],
        },
      })?.repo,
    ).toBe("me/other");
  });

  describe("status", () => {
    test.each([
      [
        { status_bucket: "SESSION_STATUS_BUCKET_WORKING" },
        SessionStatus.Running,
      ],
      [{ status_bucket: "SESSION_STATUS_BUCKET_FAILED" }, SessionStatus.Failed],
      [
        { status_bucket: "SESSION_STATUS_BUCKET_BLOCKED" },
        SessionStatus.Waiting,
      ],
      [summary({ status_category: "need_input" }), SessionStatus.Waiting],
      [summary({ status_category: "review_ready" }), SessionStatus.Review],
      [summary({ status_category: "completed" }), SessionStatus.Idle],
    ])("%o is %p", (overrides, status) => {
      expect(parseOne(overrides)?.status).toBe(status);
    });
  });

  describe("ask", () => {
    test("is the summary's needs_action", () => {
      expect(
        parseOne(summary({ needs_action: "Add the API_TOKEN secret" }))?.ask,
      ).toBe("Add the API_TOKEN secret");
    });

    test("is the status detail when a session waits without naming an action", () => {
      expect(
        parseOne({
          ...summary({ status_detail: "Shall I go?" }),
          status_bucket: "SESSION_STATUS_BUCKET_BLOCKED",
        })?.ask,
      ).toBe("Shall I go?");
    });

    test("is absent when nothing is needed", () => {
      expect(
        parseOne(summary({ status_detail: "PR merged" }))?.ask,
      ).toBeUndefined();
    });
  });

  describe("detail", () => {
    test("is the current task while running", () => {
      expect(
        parseOne({
          external_metadata: { task_summary: "Running tests" },
          status_bucket: "SESSION_STATUS_BUCKET_WORKING",
        })?.detail,
      ).toBe("Running tests");
    });

    test("is the status detail otherwise", () => {
      expect(parseOne(summary({ status_detail: "PR merged" }))?.detail).toBe(
        "PR merged",
      );
    });
  });
});
