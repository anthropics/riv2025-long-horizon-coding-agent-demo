# Using the harness primitives in Claude Code

The main repo runs the long-horizon agent on AWS (Bedrock AgentCore, GitHub Actions, CloudFront previews). If you want to apply the same primitives inside [Claude Code](https://code.claude.com/docs) or the [Claude Agent SDK](https://platform.claude.com/docs/agent-sdk) without standing up cloud infrastructure, this directory is a minimal starting point.

It pairs well with [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), which covers the design behind these primitives in a hosting-agnostic way.

## Drop-in config

Copy [`claude-code-config/.claude/`](./claude-code-config/.claude/) into your project. You get five small hooks and a `settings.json` that wires them:

| Hook | What it does |
|---|---|
| `kill-switch.sh` | `PreToolUse` — denies every tool call while a flag file exists |
| `steer.sh` | `PreToolUse` — injects a one-shot operator message into the agent's next tool result |
| `track-read.sh` | `PostToolUse` — records every screenshot/artifact the agent opens |
| `verify-gate.sh` | `PreToolUse` — refuses to mark a test passing unless the matching screenshot was opened first |
| `commit-on-stop.sh` | `Stop` — commits tracked changes at session end so nothing is lost |

Each is under 30 lines and meant to be read and adapted; see the comments in each file. They compose with the standard [hooks system](https://code.claude.com/docs/en/hooks).

## How these map to the harness primitives

| Primitive | Where it lives in this repo | Claude Code hook equivalent |
|---|---|---|
| Self-check with screenshots | `claude_code.py` Playwright capture | unchanged (the agent runs Playwright via Bash) |
| Hard verification gate | `src/security.py` | `verify-gate.sh` + `track-read.sh` |
| Durable state via git | commit-on-complete in the workflow | `commit-on-stop.sh` |
| Progress notes file | `claude-progress.txt` convention | unchanged (just a file the agent re-reads) |
| Heartbeat + watchdog | CloudWatch + state-machine | parent process polls `agent_state.json` mtime + a timeout |
| Operator kill switch / steer | n/a in the AWS flow | `kill-switch.sh` + `steer.sh` |

## Further reading

- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Claude Code hooks](https://code.claude.com/docs/en/hooks)
- [Claude Agent SDK](https://platform.claude.com/docs/agent-sdk)
