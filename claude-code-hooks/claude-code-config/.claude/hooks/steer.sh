#!/bin/bash
# If STEER.md has content, surface it to the agent once and clear the file.
# Write to STEER.md (or pipe from a UI) to redirect the agent mid-run.
f="${AGENT_STEER_FILE:-./STEER.md}"
if [ -s "$f" ]; then
  note=$(cat "$f")
  : > "$f"
  printf '{"decision":"block","reason":"OPERATOR STEERING: %s\\n\\nPause what you were about to do, incorporate this guidance, then continue toward the feature goal."}\n' \
    "$(printf '%s' "$note" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')"
fi
