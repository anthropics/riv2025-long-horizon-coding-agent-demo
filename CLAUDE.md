# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Long-horizon coding agent demo for AWS re:Invent 2025. An autonomous agent system that builds React applications from GitHub issues using AWS Bedrock AgentCore. The agent processes build plans (like Pokemon games) and generates complete frontend applications.

## Quick Start Commands

```bash
# Install root dependencies (Playwright for E2E tests)
npm install

# Run E2E tests against staging
npm run test:e2e

# Deploy AgentCore infrastructure
make deploy-infra

# Launch agent to AWS cloud
make launch

# Launch agent locally for testing
make launch-local

# Check AgentCore status
make status

# Stop a running agent session
make stop-session SESSION_ID=your-session-id

# Clean up test artifacts
make cleanup-test ISSUES="3 4"
```

### Frontend Scaffold Template

```bash
cd frontend-scaffold-template

# Install dependencies (uses pnpm)
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint
```

## Architecture

### Agent Workflow

1. **GitHub Issue Created** - User creates feature request issue
2. **Staff Approval** - Authorized user adds rocket emoji reaction
3. **Issue Poller** - Polls every 5 mins, triggers `agent-builder.yml`
4. **AgentCore Invoked** - AWS Bedrock spins up agent container
5. **Agent Builds Feature** - Uses `bedrock_entrypoint.py` with Claude Agent SDK
6. **Commits to `agent-runtime` branch** - Progress tracked via commits
7. **Deploy Preview** - `deploy-preview.yml` deploys to S3/CloudFront

### Key Components

- **`bedrock_entrypoint.py`** - Main agent entrypoint for AWS Bedrock AgentCore
- **`claude_code.py`** - Local development runner for the agent
- **`src/`** - Python modules (session management, GitHub integration, git operations)
- **`prompts/`** - Build plans and system prompts for different projects
- **`frontend-scaffold-template/`** - React + Vite + Tailwind + shadcn/ui scaffold

### AWS Resources

- **Region**: `us-west-2`
- **AgentCore Runtime**: `antodo_agent-0UyfaL5NVq`
- **Stack Name**: `claude-code-reinvent`

## Development Workflow

### Creating Build Plans

Build plans go in `prompts/` directory:
- `prompts/BUILD_PLAN.md` - Default build plan
- `prompts/antodo/BUILD_PLAN.md` - Todo app build plan
- `prompts/canopy/BUILD_PLAN.md` - Pokemon game build plan

### Testing Agent Locally

```bash
# Set required env vars
export ANTHROPIC_API_KEY=your-key

# Run with docker-compose
docker-compose up

# Or run directly
python claude_code.py --project pokemon --model claude-opus-4-5-20251101
```

### GitHub Actions Workflows

- **`agent-builder.yml`** - Triggers on rocket reaction, invokes AgentCore
- **`issue-poller.yml`** - Polls for approved issues every 5 minutes
- **`deploy-preview.yml`** - Deploys generated apps to CloudFront previews
- **`stop-agent-on-close.yml`** - Stops agent when issue is closed

### Authorized Approvers

Only these GitHub users can approve issues with rocket reaction:
- `nadine-anthropic`
- `zealoushacker`

## Tech Stack

### Agent Runtime (Python)

- Python 3.12
- `claude-agent-sdk` - Anthropic's agent SDK
- `boto3` - AWS SDK
- `PyGithub` - GitHub API
- `opentelemetry` - Observability via AWS ADOT

### Frontend Scaffold (TypeScript/React)

- React 19 + Vite 7
- Tailwind CSS 4 + tw-animate-css
- shadcn/ui components (Radix UI primitives)
- TypeScript 5.8
- pnpm package manager

### Infrastructure

- AWS Bedrock AgentCore
- Docker (linux/arm64)
- S3 + CloudFront for previews

## Important Environment Variables

```bash
# Required for agent
ANTHROPIC_API_KEY=         # Claude API key

# Optional configuration
DEFAULT_MODEL=claude-opus-4-5-20251101
PUSH_INTERVAL_SECONDS=300
SCREENSHOT_INTERVAL_SECONDS=300
SESSION_DURATION_HOURS=7.0
```

## Gotchas

- **Git Init Check**: Agent checks if already in a git repo before running `git init` to avoid nested repos
- **Generated App Location**: Apps are generated in `generated-app/` directory within the agent-runtime workspace
- **Workspace Initialization**: Docker CMD copies `prompts/` and `frontend-scaffold-template/` to `/app/workspace/` at startup
- **Browser Automation**: Playwright CLI for screenshots (`npx playwright screenshot`), installed via `npx playwright install chromium`
- **Progress Tracking**: Agent writes progress to `claude-progress.txt` in the generated app directory
- **Preview URLs**: Format is `https://{CDN_DOMAIN}/previews/issue-{N}/`
