import { z } from "zod";

export enum SessionStatus {
  Waiting = 0,
  Running = 1,
  Review = 2,
  Failed = 3,
  Idle = 4,
}

export type Session = {
  id: string;
  title: string;
  url: string;
  status: SessionStatus;
  /** What the session needs from the person, if anything. */
  ask: string | undefined;
  detail: string | undefined;
  repo: string | undefined;
  updatedAt: string;
  unread: boolean;
};

const summarySchema = z.object({
  needs_action: z.string().optional(),
  recent_action: z.string().optional(),
  status_category: z.string().optional(),
  status_detail: z.string().optional(),
});

const sessionSchema = z.object({
  external_metadata: z
    .object({
      post_turn_summary: summarySchema.optional(),
      task_summary: z.string().optional(),
    })
    .optional(),
  id: z.string(),
  post_turn_summary: summarySchema.optional(),
  session_context: z
    .object({
      outcomes: z
        .array(
          z.object({
            git_repository: z
              .object({
                git_info: z
                  .object({
                    branches: z.array(z.string()).optional(),
                    repo: z.string(),
                  })
                  .optional(),
              })
              .optional(),
          }),
        )
        .optional(),
      sources: z
        .array(
          z.object({
            git_repository: z.object({ url: z.string() }).optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  session_status: z.string(),
  status_bucket: z.string().optional(),
  task_summary: z.string().optional(),
  title: z.string().optional(),
  unread: z.boolean().optional(),
  updated_at: z.string(),
});

type RawSession = z.infer<typeof sessionSchema>;
type Summary = z.infer<typeof summarySchema>;

const listSchema = z.object({ data: z.array(sessionSchema) });
const payloadSchema = z.union([z.object({ ccr: listSchema }), listSchema]);

/**
 * Parses the Claude Code Remote connector's `list_sessions` payload (an
 * object, or the same as JSON text) into the person's non-archived sessions.
 */
export const parseSessions = (payload: unknown): Session[] => {
  const parsed = payloadSchema.parse(
    typeof payload === "string" ? JSON.parse(payload) : payload,
  );
  const list = "ccr" in parsed ? parsed.ccr : parsed;
  return list.data
    .filter((s) => s.session_status !== "SESSION_STATUS_ARCHIVED")
    .map(toSession);
};

const toSession = (raw: RawSession): Session => {
  const summary: Summary = {
    ...raw.post_turn_summary,
    ...raw.external_metadata?.post_turn_summary,
  };
  const status = toStatus(raw.status_bucket ?? "", summary.status_category);
  return {
    ask: toAsk(status, summary),
    detail: toDetail(status, raw, summary),
    id: raw.id,
    repo: toRepo(raw),
    status,
    title: raw.title ?? "Untitled session",
    unread: raw.unread === true,
    updatedAt: raw.updated_at,
    url: `https://claude.ai/code/${raw.id}`,
  };
};

const toStatus = (
  bucket: string,
  category: string | undefined,
): SessionStatus => {
  if (bucket.endsWith("WORKING")) {
    return SessionStatus.Running;
  } else if (bucket.endsWith("FAILED")) {
    return SessionStatus.Failed;
  } else if (bucket.endsWith("BLOCKED") || category === "need_input") {
    return SessionStatus.Waiting;
  } else if (category === "review_ready") {
    return SessionStatus.Review;
  } else {
    return SessionStatus.Idle;
  }
};

const toAsk = (status: SessionStatus, summary: Summary): string | undefined =>
  nonEmpty(summary.needs_action) ??
  (status === SessionStatus.Waiting
    ? nonEmpty(summary.status_detail)
    : undefined);

const toDetail = (
  status: SessionStatus,
  raw: RawSession,
  summary: Summary,
): string | undefined =>
  status === SessionStatus.Running
    ? nonEmpty(raw.external_metadata?.task_summary ?? raw.task_summary)
    : nonEmpty(summary.status_detail);

const toRepo = (raw: RawSession): string | undefined => {
  const info = raw.session_context?.outcomes?.[0]?.git_repository?.git_info;
  const branch = info?.branches?.[0];
  if (info === undefined) {
    return raw.session_context?.sources?.[0]?.git_repository?.url.replace(
      /^https:\/\/github\.com\//,
      "",
    );
  } else {
    return branch === undefined ? info.repo : `${info.repo} · ${branch}`;
  }
};

const nonEmpty = (text: string | undefined): string | undefined => {
  const trimmed = text?.trim();
  return trimmed === "" ? undefined : trimmed;
};
