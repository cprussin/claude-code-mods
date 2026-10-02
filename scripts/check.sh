#!/usr/bin/env bash
# Everything that can be checked here, in one command.
#
#   ./scripts/check.sh                # every group
#   ./scripts/check.sh typescript     # one group
#
# The groups are `shell` and `typescript`. Every workflow in
# `.github/workflows/` runs a group of this script and nothing else, so what CI
# checks and what a checkout checks cannot drift apart.
#
# A script that cannot run exits 77 (automake's convention) and prints a
# `SKIP: <why>` line. A skip is reported, never counted as a pass.
# `CHECK_STRICT=1` (CI) turns a skip into a failure, except for the checks named
# in `CHECK_ALLOW_SKIP` (space separated).
#
# A check's output is kept in a file and only shown when it fails, so a green
# run is a table and a red one is a table plus the output of what broke. A
# passing check's `PASS:` lines are printed under its `ok`.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASSED=(); FAILED=(); SKIPPED=()

# Not `GROUPS`: bash owns that name and silently ignores assignments to it.
KNOWN=(shell typescript)
SELECTED=("$@")
[ "${#SELECTED[@]}" -eq 0 ] && SELECTED=("${KNOWN[@]}")
# An unknown group is a typo, and a typo that selects nothing exits 0.
for group in "${SELECTED[@]}"; do
  case " ${KNOWN[*]} " in
    *" $group "*) ;;
    *) echo "check: no such group '$group'. Known: ${KNOWN[*]}" >&2; exit 2 ;;
  esac
done
wanted() {
  for group in "${SELECTED[@]}"; do [ "$group" = "$1" ] && return 0; done
  return 1
}

STRICT="${CHECK_STRICT:-0}"
EXPECTED_SKIPS="${CHECK_ALLOW_SKIP:-}"
readonly SKIPPED_STATUS=77

FAILURES="$(mktemp)"
# Deliberately not cleaned up: a failing check's whole log is what a reader
# needs after the run ends.
KEEP_LOGS="${CHECK_LOG_DIR:-${TMPDIR:-/tmp}}/claude-code-mods-check-logs"
rm -rf "$KEEP_LOGS"; mkdir -p "$KEEP_LOGS"
trap 'rm -f "$FAILURES"' EXIT

label() {
  printf '  %-24s ' "$1"
}

run() {
  local name="$1"; shift
  local log; log="$(mktemp)"
  label "$name"
  "$@" >"$log" 2>&1
  verdict "$name" "$?" "$log"
}

verdict() {
  local name="$1" status="$2" log="$3"
  if [ "$status" -eq 0 ]; then
    echo "ok"
    sed -n 's/^ *PASS: /    PASS: /p' "$log"
    PASSED+=("$name")
  elif [ "$status" -eq "$SKIPPED_STATUS" ]; then
    skip "$name" "$(sed -n 's/^ *SKIP: *//p' "$log" | head -1)"
  else
    echo "FAILED"
    FAILED+=("$name")
    echo "--- $name ---" >>"$FAILURES"
    tail -100 "$log" >>"$FAILURES"
    # The whole log too: the interesting line is often not in the tail.
    cp "$log" "$KEEP_LOGS/$name.log"
    echo "  (the whole log: $KEEP_LOGS/$name.log)" >>"$FAILURES"
    echo >>"$FAILURES"
  fi
  rm -f "$log"
}

skip() {
  case " $EXPECTED_SKIPS " in
    *" $1 "*)
      printf 'skipped, as expected here (%s)\n' "$2"
      SKIPPED+=("$1 — expected: $2")
      return
      ;;
  esac
  if [ "$STRICT" = "1" ]; then
    printf 'FAILED (%s)\n' "$2"
    FAILED+=("$1 — could not run: $2")
    printf -- '--- %s ---\ncould not run: %s\n\n' "$1" "$2" >>"$FAILURES"
  else
    printf 'skipped (%s)\n' "$2"
    SKIPPED+=("$1 — $2")
  fi
}

# ---- the environment ------------------------------------------------------

echo "== environment =="

# Every run, not only when `node_modules` is absent: one left over from another
# branch is present and wrong.
label "bun install"
if bun install --frozen-lockfile >/dev/null 2>&1; then echo "ok"; else
  echo "FAILED"; echo "dependencies would not install" >&2; exit 1
fi

# ---- the checks -----------------------------------------------------------

# Every `test-*.sh`: a check added and not run is the same as one never written.
if wanted shell; then
  echo
  echo "== shell =="
  for script in scripts/test-*.sh; do
    run "$(basename "$script" .sh)" "$script"
  done
fi

if wanted typescript; then
  echo
  echo "== typescript =="
  run "biome" bunx biome check .
  run "turbo test" bun run turbo test -- --ui stream
fi

# ---- what happened --------------------------------------------------------

echo
if [ "${#FAILED[@]}" -gt 0 ]; then
  echo "== what failed =="
  cat "$FAILURES"
fi
echo "== ${#PASSED[@]} passed, ${#FAILED[@]} failed, ${#SKIPPED[@]} skipped =="
# "Nothing failed" is not the same claim as "something passed".
if [ $(( ${#PASSED[@]} + ${#FAILED[@]} + ${#SKIPPED[@]} )) -eq 0 ]; then
  echo "  and that is a failure: nothing ran."
  exit 1
fi
for one in "${SKIPPED[@]:-}"; do [ -n "$one" ] && echo "  skipped: $one"; done
for one in "${FAILED[@]:-}"; do [ -n "$one" ] && echo "  failed:  $one"; done
[ "${#FAILED[@]}" -eq 0 ]
