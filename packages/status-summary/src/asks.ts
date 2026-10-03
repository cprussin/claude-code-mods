import type { Session } from "./sessions";

/**
 * Sessions with an ask the person hasn't dismissed. `dismissed` maps a session
 * id to the ask text dismissed, so a session that asks something new shows again.
 */
export const openAsks = (
  sessions: readonly Session[],
  dismissed: Readonly<Record<string, string>>,
): Session[] =>
  sessions.filter((s) => s.ask !== undefined && dismissed[s.id] !== s.ask);
