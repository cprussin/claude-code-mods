const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const formatAge = (from: Date, now: Date): string => {
  const ms = now.getTime() - from.getTime();
  if (ms < MINUTE) {
    return "just now";
  } else if (ms < HOUR) {
    return `${Math.floor(ms / MINUTE)}m ago`;
  } else if (ms < DAY) {
    return `${Math.floor(ms / HOUR)}h ago`;
  } else {
    return `${Math.floor(ms / DAY)}d ago`;
  }
};
