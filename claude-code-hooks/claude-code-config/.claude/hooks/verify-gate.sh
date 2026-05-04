#!/bin/bash
# Denies any Write/Edit that flips a test to "passes": true unless the agent has opened
# at least one evidence file (screenshot/console log) since the gate last fired.
# Simplified from the full harness gate in src/security.py; tune RESULTS_FILE to your project.
#
# Note: this is a teaching example, not a security boundary. The evidence log is
# writable by the agent, so a determined agent could write to it directly. For
# production use, track evidence in storage the agent cannot write to (owned by
# the hook-runner process, append-only permissions, or an external store).
log="${VERIFY_READ_LOG:-/tmp/cc-evidence-reads.$PPID}"
results="${RESULTS_FILE:-test-results.json}"

input=$(cat)
target=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)

# Only guard the results file
case "$target" in *"$results") ;; *) exit 0 ;; esac

content=$(printf '%s' "$input" | python3 -c 'import json,sys; d=json.load(sys.stdin).get("tool_input",{}); print(d.get("content") or d.get("new_string") or "")' 2>/dev/null)

if printf '%s' "$content" | grep -qE '"passes"[[:space:]]*:[[:space:]]*true'; then
  if [ ! -s "$log" ]; then
    cat <<JSON
{"decision":"block","reason":"Cannot mark a test as passing: no screenshot or console-log evidence has been Read this session. Open the evidence file with the Read tool first, then retry."}
JSON
    exit 0
  fi
  # consume the evidence so the next pass needs fresh proof
  : > "$log"
fi
