#!/bin/bash
# Records which evidence files (screenshots, console logs) the agent has opened this session.
# verify-gate.sh consults this list before allowing a test to be marked passing.
log="${VERIFY_READ_LOG:-/tmp/cc-evidence-reads.$PPID}"
path=$(cat | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
case "$path" in
  *screenshots/*|*-console.txt|*-result.txt|*.png) echo "$path" >> "$log" ;;
esac
