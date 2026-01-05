# Chewy

Autonomous coding agent for eqho.ai that builds applications from GitHub issues using AWS Bedrock AgentCore and the Claude Agent SDK.

## How It Works

### End-to-End Flow

1. **User creates GitHub issue** with a feature request
2. **Users vote** with 👍 reactions to prioritize what gets built
3. **Authorized user approves** by adding a 🚀 reaction
4. **Issue poller** (runs every 5 min) detects approved issues, sorted by votes
5. **Agent builder** workflow acquires lock and invokes AWS Bedrock AgentCore
6. **Bedrock entrypoint** clones the repo and starts the Claude agent
7. **Agent builds the feature** following the build plan, taking screenshots, running tests
8. **Progress is tracked** via commits pushed to the `agent-runtime` branch
9. **Screenshots and updates are posted** to the GitHub issue
10. **On completion**, the agent signals done, commits are pushed, and `agent-complete` label is added
11. **If more issues exist**, the agent continues in enhancement mode
12. **Deploy preview** workflow builds and deploys to CloudFront

## Key Features

- **Vote-based prioritization** - Issues with more 👍 reactions are built first
- **Health monitoring** - CloudWatch heartbeat detects stale sessions and triggers auto-restart
- **Incremental builds** - Agent builds new features on top of existing generated code
- **Screenshot capture** - Playwright takes screenshots throughout development
- **Live previews** - Each issue gets a CloudFront preview URL

## Configuration

### Prerequisites

- AWS account with Bedrock AgentCore access
- GitHub repository with Actions enabled
- Docker for local development

### AWS Configuration

1. Copy `.bedrock_agentcore.yaml.template` to `.bedrock_agentcore.yaml`
2. Fill in your AWS values:

| Value | Description | Example |
|-------|-------------|---------|
| `YOUR_ACCOUNT_ID` | Your AWS account ID | `123456789012` |
| `YOUR_EXECUTION_ROLE` | IAM role for AgentCore runtime | `AmazonBedrockAgentCoreSDKRuntime-...` |
| `YOUR_PROJECT_NAME` | ECR repository name | `my-agent` |
| `YOUR_AGENT_RUNTIME_ID` | AgentCore runtime ID (after first deploy) | `my_agent-abc123` |
| `YOUR_CODEBUILD_ROLE` | IAM role for CodeBuild | `AmazonBedrockAgentCoreSDKCodeBuild-...` |

### GitHub Repository Secrets

Configure in Settings → Secrets and variables → Actions → Secrets:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key for GitHub Actions |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_AGENTCORE_ROLE_ARN` | IAM role ARN for invoking AgentCore |
| `AWS_PREVIEW_DEPLOY_ROLE_ARN` | IAM role ARN for deploying previews |

### GitHub Repository Variables

Configure in Settings → Secrets and variables → Actions → Variables:

| Variable | Description |
|----------|-------------|
| `AUTHORIZED_APPROVERS` | Comma-separated GitHub usernames who can approve builds with 🚀 |
| `PREVIEWS_BUCKET_NAME` | S3 bucket for preview deployments |
| `PREVIEWS_CDN_DOMAIN` | CloudFront domain for previews |
| `PREVIEWS_DISTRIBUTION_ID` | CloudFront distribution ID for cache invalidation |

### GitHub Repository Labels

The following labels must exist for the workflows to function properly:

| Label | Color | Description |
|-------|-------|-------------|
| `agent-building` | `#FBCA04` (yellow) | Agent is actively working on this issue |
| `agent-complete` | `#0E8A16` (green) | Agent has completed this issue |
| `tests-failed` | `#D93F0B` (red) | Tests failed during agent build |

Create these at Settings → Labels, or via CLI:
```bash
gh api repos/OWNER/REPO/labels -f name="agent-building" -f color="FBCA04" -f description="Agent is actively working on this issue"
gh api repos/OWNER/REPO/labels -f name="agent-complete" -f color="0E8A16" -f description="Agent has completed this issue"
gh api repos/OWNER/REPO/labels -f name="tests-failed" -f color="D93F0B" -f description="Tests failed during agent build"
```

### AWS Secrets Manager

The agent reads secrets from AWS Secrets Manager. Required secrets:

| Secret Name | Description |
|-------------|-------------|
| `claude-code/{env}/anthropic-api-key` | Anthropic API key for Claude |
| `claude-code/{env}/github-token` | Default GitHub PAT (fallback) |
| `claude-code/{env}/github-token-{org}` | Org-specific GitHub PAT (optional) |

Where `{env}` is the environment name (e.g., `prod`, `staging`) and `{org}` is the GitHub organization name.

**Org-specific tokens** allow separation of concerns when working with multiple GitHub organizations. The agent checks for an org-specific token first, then falls back to the default:

```bash
# Create org-specific token (recommended for multi-org setups)
aws secretsmanager create-secret \
  --name claude-code/prod/github-token-myorg \
  --secret-string "ghp_your_pat_here" \
  --region us-west-2

# Or update existing default token
aws secretsmanager update-secret \
  --secret-id claude-code/prod/github-token \
  --secret-string "ghp_your_pat_here" \
  --region us-west-2
```

## Project Structure

```
├── bedrock_entrypoint.py    # Main orchestrator for AWS Bedrock AgentCore
├── claude_code.py           # Agent session manager and local runner
├── src/                     # Python modules
│   ├── cloudwatch_metrics.py  # Heartbeat and metrics
│   ├── github_integration.py  # GitHub API operations
│   └── git_operations.py      # Git commit/push logic
├── prompts/                 # Build plans and system prompts
│   └── {project}/           # Project-specific build plans
├── frontend-scaffold-template/  # React + Vite + Tailwind scaffold
└── .github/workflows/       # GitHub Actions
    ├── issue-poller.yml     # Polls for approved issues
    ├── agent-builder.yml    # Invokes AgentCore
    └── deploy-preview.yml   # Deploys to CloudFront
```

## License

Apache 2.0
