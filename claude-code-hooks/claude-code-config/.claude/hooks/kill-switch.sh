#!/bin/bash
# Halt every tool call while ./AGENT_STOP exists. `touch AGENT_STOP` to engage; `rm AGENT_STOP` to resume.
if [ -f "${AGENT_STOP_FILE:-./AGENT_STOP}" ]; then
  cat <<JSON
{"decision":"block","reason":"Kill switch engaged: ${AGENT_STOP_FILE:-./AGENT_STOP} exists. Agent is halted. Remove the file to resume."}
JSON
fi
